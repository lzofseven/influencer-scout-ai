import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            q: "O que essa ferramenta faz exatamente?",
            a: "Nossa IA analisa milhões de perfis em tempo real no Instagram e outras redes. Em vez de buscar manualmente por horas, você digita um prompt complexo e ela cruza dados para encontrar influenciadores ultra-nichados com engajamento verdadeiro."
        },
        {
            q: "Como funciona a cobrança de créditos?",
            a: "Um crédito é deduzido sempre que a IA completa com sucesso uma varredura e traz os influenciadores solicitados. Se a busca não encontrar ninguém ou falhar, nenhum crédito é cobrado."
        },
        {
            q: "Vocês possuem um plano gratuito?",
            a: "Oferecemos 5 créditos de boas-vindas totalmente gratuitos para novas contas. Após utilizar esses testes, você precisará assinar um dos nossos planos Black ou Scale para continuar alavancando suas prospecções."
        },
        {
            q: "Posso cancelar minha assinatura a qualquer momento?",
            a: "Sim. Nossa plataforma é sem fidelidade. Você pode cancelar sua renovação a qualquer momento direto pelo painel de controle."
        },
        {
            q: "Os dados de engajamento são precisos?",
            a: "Sim. Conectamos com as métricas vitais de API para assegurar que curtidas e comentários batam matematicamente com as visualizações e número de seguidores, prevenindo parcerias furadas."
        }
    ];

    return (
        <section className="bg-white dark:bg-[#0A0A0A] py-24 border-t border-gray-100 dark:border-[#1A1A1A]">
            <div className="max-w-3xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Perguntas Frequentes</h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400">Tudo o que você precisa saber sobre o nosso motor de prospecção.</p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className={`border rounded-2xl transition-all duration-300 ${openIndex === i
                                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-[#111] shadow-md'
                                    : 'border-gray-200 dark:border-[#222] bg-white dark:bg-[#0A0A0A] hover:border-gray-400 dark:hover:border-[#444]'
                                }`}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full text-left px-8 py-6 flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 rounded-2xl"
                            >
                                <span className="text-lg font-bold text-gray-900 dark:text-white pr-8">{faq.q}</span>
                                {openIndex === i ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                                )}
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <p className="px-8 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed text-base pt-2 border-t border-dashed border-gray-200 dark:border-[#333] mt-2">
                                    {faq.a}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
