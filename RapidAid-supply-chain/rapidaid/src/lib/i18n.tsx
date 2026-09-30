import { createContext, useContext, useState, type ReactNode } from 'react'

export const LANGS = [
  { code: 'en', name: 'English', speech: 'en-IN' },
  { code: 'hi', name: 'हिन्दी', speech: 'hi-IN' },
  { code: 'ta', name: 'தமிழ்', speech: 'ta-IN' },
  { code: 'te', name: 'తెలుగు', speech: 'te-IN' },
  { code: 'kn', name: 'ಕನ್ನಡ', speech: 'kn-IN' },
  { code: 'bn', name: 'বাংলা', speech: 'bn-IN' },
  { code: 'mr', name: 'मराठी', speech: 'mr-IN' },
] as const
export type LangCode = (typeof LANGS)[number]['code']

type Dict = Record<string, string>
const T: Record<LangCode, Dict> = {
  en: { command: 'Command', stock: 'Stock', forecast: 'Forecast', redistribute: 'Redistribute', federated: 'Federated AI', emergency: 'Emergency', assistant: 'Assistant', live: 'Live', phcs: 'PHCs', bedsFree: 'Beds free', attendance: 'Staff present', alerts: 'Stock-out alerts', ask: 'Ask about stock, beds or transfers…', send: 'Send', speak: 'Speak', approve: 'Approve transfer', brief: 'AI situation brief' },
  hi: { command: 'कमांड', stock: 'स्टॉक', forecast: 'पूर्वानुमान', redistribute: 'पुनर्वितरण', federated: 'फ़ेडरेटेड एआई', emergency: 'आपातकाल', assistant: 'सहायक', live: 'लाइव', phcs: 'पीएचसी', bedsFree: 'खाली बिस्तर', attendance: 'उपस्थित स्टाफ', alerts: 'स्टॉक-आउट चेतावनी', ask: 'स्टॉक, बिस्तर या ट्रांसफ़र के बारे में पूछें…', send: 'भेजें', speak: 'बोलें', approve: 'ट्रांसफ़र मंज़ूर करें', brief: 'एआई स्थिति सारांश' },
  ta: { command: 'கட்டுப்பாடு', stock: 'இருப்பு', forecast: 'முன்கணிப்பு', redistribute: 'மறுவிநியோகம்', federated: 'கூட்டமைப்பு AI', emergency: 'அவசரம்', assistant: 'உதவியாளர்', live: 'நேரலை', phcs: 'ஆரம்ப சுகாதார நிலையங்கள்', bedsFree: 'காலி படுக்கைகள்', attendance: 'பணியில் உள்ளோர்', alerts: 'இருப்பு தீர்வு எச்சரிக்கைகள்', ask: 'இருப்பு, படுக்கைகள் பற்றி கேளுங்கள்…', send: 'அனுப்பு', speak: 'பேசுங்கள்', approve: 'மாற்றத்தை அங்கீகரி', brief: 'AI நிலை சுருக்கம்' },
  te: { command: 'కమాండ్', stock: 'నిల్వ', forecast: 'అంచనా', redistribute: 'పునఃపంపిణీ', federated: 'ఫెడరేటెడ్ AI', emergency: 'అత్యవసరం', assistant: 'సహాయకుడు', live: 'లైవ్', phcs: 'పీహెచ్‌సీలు', bedsFree: 'ఖాళీ పడకలు', attendance: 'హాజరైన సిబ్బంది', alerts: 'నిల్వ అయిపోయే హెచ్చరికలు', ask: 'నిల్వ, పడకల గురించి అడగండి…', send: 'పంపు', speak: 'మాట్లాడండి', approve: 'బదిలీని ఆమోదించండి', brief: 'AI పరిస్థితి సారాంశం' },
  kn: { command: 'ಕಮಾಂಡ್', stock: 'ದಾಸ್ತಾನು', forecast: 'ಮುನ್ಸೂಚನೆ', redistribute: 'ಮರುಹಂಚಿಕೆ', federated: 'ಫೆಡರೇಟೆಡ್ AI', emergency: 'ತುರ್ತು', assistant: 'ಸಹಾಯಕ', live: 'ಲೈವ್', phcs: 'ಪಿಎಚ್‌ಸಿಗಳು', bedsFree: 'ಖಾಲಿ ಹಾಸಿಗೆಗಳು', attendance: 'ಹಾಜರಿರುವ ಸಿಬ್ಬಂದಿ', alerts: 'ದಾಸ್ತಾನು ಮುಗಿಯುವ ಎಚ್ಚರಿಕೆ', ask: 'ದಾಸ್ತಾನು, ಹಾಸಿಗೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ…', send: 'ಕಳುಹಿಸಿ', speak: 'ಮಾತನಾಡಿ', approve: 'ವರ್ಗಾವಣೆ ಅನುಮೋದಿಸಿ', brief: 'AI ಪರಿಸ್ಥಿತಿ ಸಾರಾಂಶ' },
  bn: { command: 'কমান্ড', stock: 'মজুত', forecast: 'পূর্বাভাস', redistribute: 'পুনর্বণ্টন', federated: 'ফেডারেটেড এআই', emergency: 'জরুরি', assistant: 'সহায়ক', live: 'লাইভ', phcs: 'পিএইচসি', bedsFree: 'খালি শয্যা', attendance: 'উপস্থিত কর্মী', alerts: 'মজুত শেষের সতর্কতা', ask: 'মজুত, শয্যা বা স্থানান্তর নিয়ে জিজ্ঞাসা করুন…', send: 'পাঠান', speak: 'বলুন', approve: 'স্থানান্তর অনুমোদন করুন', brief: 'এআই পরিস্থিতি সারাংশ' },
  mr: { command: 'कमांड', stock: 'साठा', forecast: 'अंदाज', redistribute: 'पुनर्वितरण', federated: 'फेडरेटेड एआय', emergency: 'आपत्कालीन', assistant: 'सहाय्यक', live: 'लाइव्ह', phcs: 'पीएचसी', bedsFree: 'रिकाम्या खाटा', attendance: 'उपस्थित कर्मचारी', alerts: 'साठा संपण्याचे इशारे', ask: 'साठा, खाटा किंवा हस्तांतरणाबद्दल विचारा…', send: 'पाठवा', speak: 'बोला', approve: 'हस्तांतरण मंजूर करा', brief: 'एआय परिस्थिती सारांश' },
}

interface Ctx { lang: LangCode; setLang: (l: LangCode) => void; t: (k: string) => string; speech: string }
const I18n = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => k, speech: 'en-IN' })
export const useI18n = () => useContext(I18n)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>('en')
  const t = (k: string) => T[lang][k] ?? T.en[k] ?? k
  return <I18n.Provider value={{ lang, setLang, t, speech: LANGS.find((l) => l.code === lang)!.speech }}>{children}</I18n.Provider>
}
