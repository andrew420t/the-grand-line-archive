import { useState } from 'react'
import { findCatalogueMatches, catalogueMatchToForm } from './cardCatalogue'

export default function CatalogueLanguageButtons({ cardNumber, fieldKey, onApply }) {
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const fieldMap = { name: 'name', effect_text: 'effect_text', classification: 'classification' }

  const chooseLanguage = async (languageCode) => {
    if (!cardNumber?.trim()) {
      setError('Enter a card number first.')
      return
    }
    setLoading(languageCode)
    setError('')
    try {
      const matches = await findCatalogueMatches(cardNumber)
      const match = matches.find((item) => item.languageCode === languageCode) ||
        matches.find((item) => languageCode === 'en' ? item.language?.startsWith('English') : item.language === 'Japanese')
      const valueKey = fieldMap[fieldKey]
      if (!match || !valueKey) {
        setError(`No ${languageCode === 'jp' ? 'Japanese' : 'English'} text was found for this card.`)
        return
      }
      const details = catalogueMatchToForm(match)
      const value = details[valueKey]
      if (!String(value || '').trim()) {
        setError(`The ${languageCode === 'jp' ? 'Japanese' : 'English'} ${fieldKey === 'effect_text' ? 'effect' : fieldKey === 'classification' ? 'classification' : 'name'} is not available in the catalogue.`)
        return
      }
      onApply(value, languageCode === 'jp' ? 'Japanese' : 'English')
    } catch (lookupError) {
      setError(lookupError.message || 'Could not load the card language details.')
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="catalogue-language-tools">
      <span>Set this field to:</span>
      <button className="text-button" type="button" disabled={Boolean(loading)} onClick={() => chooseLanguage('en')}>{loading === 'en' ? 'Loading English…' : 'English'}</button>
      <button className="text-button" type="button" disabled={Boolean(loading)} onClick={() => chooseLanguage('jp')}>{loading === 'jp' ? 'Loading Japanese…' : 'Japanese'}</button>
      {error && <small className="form-error" role="status">{error}</small>}
    </div>
  )
}
