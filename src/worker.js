import { handleCardImageProxy } from './cardImageProxy.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/_card-image/')) return handleCardImageProxy(request)
    return env.ASSETS.fetch(request)
  },
}
