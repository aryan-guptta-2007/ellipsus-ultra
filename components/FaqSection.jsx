import { ChevronDown } from "lucide-react"

const QUESTIONS = [
    {
        question: "Where are my files stored?",
        answer: "In your browser's IndexedDB storage on this device, in encrypted form. Nothing is uploaded, so your vault doesn't follow you to other browsers or devices unless you move a backup there.",
    },
    {
        question: "What happens if I forget my passphrase?",
        answer: "Your files can't be recovered. There's no reset link and no master key on our side, because the passphrase is the only way in. Keep it in a password manager or somewhere equally safe.",
    },
    {
        question: "Can I lose my files some other way?",
        answer: "Yes. Clearing this site's data in your browser erases the vault, and so does losing the device. Export an encrypted backup from Settings regularly, and keep it somewhere separate.",
    },
    {
        question: "How large can a file be?",
        answer: "Up to 256 MB each. Your total depends on how much storage your browser allows, which you can check in Settings.",
    },
    {
        question: "What doesn't StealthVault protect against?",
        answer: "It can't protect you from malware on your own device, someone watching over your shoulder, or a weak passphrase. While the vault is unlocked, your files are readable by whoever is using your browser, which is why it locks itself.",
    },
    {
        question: "Does it work offline?",
        answer: "Once the page has loaded, everything runs in your browser, so encrypting and decrypting need no connection. Loading the page itself still does.",
    },
]

export default function FaqSection() {
    return (
        <section id="faq" className="relative bg-[#0b0c10] pb-24 md:pb-32 scroll-mt-24">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="font-serif text-[2.5rem] md:text-[3.5rem] leading-tight text-[#E6EAF0]">Questions</h2>
                <div className="mt-10 divide-y divide-white/5 border-y border-white/5">
                    {QUESTIONS.map(({ question, answer }) => (
                        <details key={question} className="group">
                            <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-base font-medium text-gray-100 hover:text-white [&::-webkit-details-marker]:hidden">
                                {question}
                                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 transition-transform group-open:rotate-180" />
                            </summary>
                            <p className="pb-5 text-sm text-gray-400 leading-relaxed">{answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    )
}
