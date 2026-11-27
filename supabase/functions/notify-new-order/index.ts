const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  })

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] || character))

const formatMoney = (value: unknown) => new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
}).format(Number(value || 0))

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const baseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  const resendKey = Deno.env.get('RESEND_API_KEY') || ''
  const emailFrom = Deno.env.get('ORDER_EMAIL_FROM') || ''

  if (!baseUrl || !serviceKey || !publicKey) {
    return json({ error: 'Order notification service is not configured.' }, 503)
  }

  const authorization = request.headers.get('authorization') || ''
  if (!/^Bearer\s+\S+/i.test(authorization)) return json({ error: 'Sign in is required.' }, 401)

  let authUser: { id?: string; email?: string }
  try {
    const authResponse = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: authorization },
    })
    if (!authResponse.ok) return json({ error: 'Your session could not be verified.' }, 401)
    authUser = await authResponse.json()
  } catch {
    return json({ error: 'Authentication service is temporarily unavailable.' }, 503)
  }
  if (!authUser?.id) return json({ error: 'Sign in is required.' }, 401)

  let body: { orderId?: string; retry?: boolean }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const orderId = String(body.orderId || '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return json({ error: 'A valid order ID is required.' }, 400)
  }

  const serviceHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
  const restUrl = `${baseUrl}/rest/v1`
  const rest = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${restUrl}/${path}`, {
      ...init,
      headers: { ...serviceHeaders, ...(init.headers || {}) },
    })
    const text = await response.text()
    let payload: unknown = null
    try { payload = text ? JSON.parse(text) : null } catch { payload = text }
    if (!response.ok) {
      const detail = typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message || response.statusText)
        : response.statusText
      throw new Error(detail || `Database request failed (${response.status}).`)
    }
    return payload
  }

  const patchOrderStatus = async (status: string, errorMessage: string | null = null, sentAt: string | null = null) => {
    await rest(`orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        admin_email_status: status,
        admin_email_error: errorMessage,
        admin_email_sent_at: sentAt,
      }),
    })
  }

  try {
    const orderRows = await rest(
      `orders?id=eq.${orderId}&select=id,user_id,status,total_amount,total,customer_name,customer_email,pickup_method,admin_email_status,admin_email_error,admin_email_sent_at`,
    ) as Array<Record<string, unknown>>
    const order = orderRows?.[0]
    if (!order) return json({ error: 'Order not found.' }, 404)

    let isAdmin = false
    if (String(order.user_id || '') !== String(authUser.id)) {
      const profileRows = await rest(
        `profiles?id=eq.${encodeURIComponent(authUser.id)}&select=role&limit=1`,
      ) as Array<{ role?: string }>
      isAdmin = String(profileRows?.[0]?.role || '').toLowerCase() === 'admin'
      if (!isAdmin) return json({ error: 'You are not allowed to access this order notification.' }, 403)
    }

    const currentStatus = String(order.admin_email_status || 'pending').toLowerCase()
    if (currentStatus === 'sent') {
      return json({ status: 'sent', message: 'The administrator notification has already been sent.' })
    }
    if (body.retry && !isAdmin) {
      return json({ error: 'Only an administrator can retry an order notification.' }, 403)
    }
    if (!isAdmin && currentStatus !== 'pending') {
      return json({ error: 'Only an administrator can retry this order notification.' }, 403)
    }
    if (currentStatus === 'sending') {
      return json({ status: 'sending', message: 'The administrator notification is already being sent.' })
    }

    if (!resendKey || !emailFrom) {
      const message = !resendKey
        ? 'RESEND_API_KEY is missing from Supabase Edge Function secrets.'
        : 'ORDER_EMAIL_FROM is missing from Supabase Edge Function secrets.'
      await patchOrderStatus('not_configured', message)
      return json({ status: 'not_configured', message })
    }

    const adminProfiles = await rest('profiles?role=eq.admin&select=id') as Array<{ id: string }>
    const recipients = new Set<string>()
    for (const adminProfile of adminProfiles || []) {
      if (!adminProfile.id) continue
      const userResponse = await fetch(
        `${baseUrl}/auth/v1/admin/users/${encodeURIComponent(adminProfile.id)}`,
        { headers: serviceHeaders },
      )
      if (!userResponse.ok) continue
      const adminUser = await userResponse.json()
      const email = String(adminUser?.user?.email || adminUser?.email || '').trim()
      if (email) recipients.add(email)
    }
    const to = [...recipients]
    if (!to.length) {
      const message = 'No administrator email address could be resolved from the admin profiles.'
      await patchOrderStatus('failed', message)
      return json({ status: 'failed', message })
    }

    const claimStatuses = body.retry && isAdmin
      ? 'pending,failed,not_configured'
      : 'pending'
    const claimed = await rest(
      `orders?id=eq.${orderId}&admin_email_status=in.(${claimStatuses})&select=id`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          admin_email_status: 'sending',
          admin_email_error: null,
          admin_email_sent_at: null,
        }),
      },
    ) as Array<{ id: string }>
    if (!claimed?.length) {
      const latestRows = await rest(
        `orders?id=eq.${orderId}&select=admin_email_status`,
      ) as Array<{ admin_email_status?: string }>
      return json({
        status: String(latestRows?.[0]?.admin_email_status || 'pending'),
        message: 'The notification was not claimed. Refresh the order and check its email status.',
      })
    }

    const lineItems = await rest(
      `order_items?order_id=eq.${orderId}&select=product_id,card_id,quantity,unit_price,price_at_purchase`,
    ) as Array<Record<string, unknown>>

    const productIds = [...new Set((lineItems || []).map((item) => String(item.product_id || '')).filter(Boolean))]
    let productsById = new Map<string, Record<string, unknown>>()
    if (productIds.length) {
      const inList = productIds.map((id) => `"${id}"`).join(',')
      const productRows = await rest(
        `products?id=in.(${encodeURIComponent(inList)})&select=id,name,card_number`,
      ) as Array<Record<string, unknown>>
      productsById = new Map((productRows || []).map((product) => [String(product.id), product]))
    }

    const orderReference = orderId.replace(/-/g, '').slice(-8).toUpperCase()
    const lines = (lineItems || []).map((item) => {
      const product = productsById.get(String(item.product_id || ''))
      const name = product?.name || `Card ${product?.card_number || item.card_id || item.product_id || 'unknown'}`
      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unit_price ?? item.price_at_purchase ?? 0)
      return { name: String(name), quantity, unitPrice, lineTotal: quantity * unitPrice }
    })
    const total = Number(order.total_amount ?? order.total ?? 0)
    const itemHtml = lines.map((line) => (
      `<tr><td style="padding:9px 0;border-bottom:1px solid #e9e4d8;">${escapeHtml(line.name)} × ${line.quantity}</td><td style="padding:9px 0;border-bottom:1px solid #e9e4d8;text-align:right;">${formatMoney(line.lineTotal)}</td></tr>`
    )).join('')

    const html = `<!doctype html><html><body style="margin:0;background:#f5f2eb;font-family:Arial,sans-serif;color:#25231f;padding:28px;">
      <table role="presentation" style="max-width:640px;width:100%;margin:auto;background:#fff;border:1px solid #e4dccb;padding:28px;border-collapse:collapse;">
        <tr><td><p style="letter-spacing:2px;font-size:11px;color:#98793e;font-weight:bold;">GRAND LINE ARCHIVE · NEW ORDER</p>
        <h1 style="font-family:Georgia,serif;font-weight:normal;margin:10px 0 6px;">A new order has arrived.</h1>
        <p style="color:#746f64;">Order #${orderReference} · Local pickup in Gibraltar</p></td></tr>
        <tr><td style="padding-top:20px;"><strong>Customer</strong><p style="margin:7px 0;">${escapeHtml(order.customer_name || 'Archive customer')}<br/>${escapeHtml(order.customer_email || '')}</p></td></tr>
        <tr><td><table role="presentation" style="width:100%;border-collapse:collapse;">${itemHtml}
          <tr><td style="padding:15px 0;font-weight:bold;">Order total</td><td style="padding:15px 0;text-align:right;font-weight:bold;">${formatMoney(total)}</td></tr>
        </table></td></tr>
        <tr><td style="padding-top:18px;color:#746f64;">Sign in to Captain’s Quarters → Orders to confirm pickup details and message the customer.</td></tr>
      </table></body></html>`

    const textLines = lines.map((line) => `• ${line.name} × ${line.quantity}: ${formatMoney(line.lineTotal)}`).join('\n')
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `grand-line-order-${orderId}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject: `New Grand Line Archive order #${orderReference}`,
        html,
        text: `New local pickup order #${orderReference}\nCustomer: ${order.customer_name || 'Archive customer'}\n${order.customer_email || ''}\n\n${textLines}\n\nTotal: ${formatMoney(total)}\n\nOpen Captain’s Quarters → Orders to arrange Gibraltar pickup.`,
      }),
    })
    const emailResult = await emailResponse.json().catch(() => ({}))
    if (!emailResponse.ok) {
      const message = String(emailResult?.message || emailResult?.error || `Resend returned HTTP ${emailResponse.status}.`)
      await patchOrderStatus('failed', message)
      return json({ status: 'failed', message }, 502)
    }

    const sentAt = new Date().toISOString()
    await patchOrderStatus('sent', null, sentAt)
    return json({ status: 'sent', message: 'Administrator notification sent.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected order notification error.'
    try { await patchOrderStatus('failed', message) } catch { /* preserve the original notification error */ }
    return json({ status: 'failed', message }, 500)
  }
})
