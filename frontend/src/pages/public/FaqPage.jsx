import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../utils/constants';
import PublicNavBar from '../../components/PublicNavBar';
import PublicFooter from '../../components/PublicFooter';
import Reveal from '../../motion/Reveal';
import Stagger from '../../motion/Stagger';
import { EASE } from '../../motion/variants';

const FAQ_DATA = [
  {
    id: 'account',
    items: ['verifyEmail', 'hideProfile', 'exportData'],
  },
  {
    id: 'ai',
    items: ['matchScore'],
  },
];

export default function FaqPage() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [openItem, setOpenItem] = useState('account-0');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('account');

  const toggleItem = (key) => {
    setOpenItem((prev) => (prev === key ? null : key));
  };

  const filteredData = FAQ_DATA.map((cat) => ({
    ...cat,
    items: cat.items.filter((itemKey) => {
      const q = t(`faq.items.${itemKey}.q`);
      const a = t(`faq.items.${itemKey}.a`);
      return (
        q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="stitch-page bg-background text-on-background font-body-md flex flex-col min-h-screen">
      <div>
        <PublicNavBar />
        <main className="flex-grow flex flex-col items-center w-full">
          {/* Hero Section */}
          <Reveal whenInView as="section" className="w-full bg-surface-container-lowest py-[80px] px-margin-desktop flex flex-col items-center justify-center border-b border-surface-container-high relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #131b2e 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            <div className="max-w-[800px] w-full text-center relative z-10">
              <h1 className="font-h1 text-h1 text-primary mb-stack-md">{t('faq.title')}</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-[600px] mx-auto">{t('faq.description')}</p>
              {/* Search Bar */}
              <div className="relative w-full max-w-[600px] mx-auto group">
                <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline group-focus-within:text-[#2563EB] transition-colors">search</span>
                </div>
                <input
                  className="w-full ps-12 pe-24 py-4 bg-surface-container-low border border-outline-variant rounded-lg font-body-lg text-body-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#dbe1ff] transition-all shadow-[0px_4px_20px_rgba(15,23,42,0.05)]"
                  placeholder={t('faq.searchPlaceholder')}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="absolute inset-y-0 end-2 flex items-center">
                    <button className="px-4 py-2 bg-transparent text-on-surface-variant hover:text-primary font-body-md font-semibold rounded transition-colors" onClick={() => setSearchQuery('')}>
                      {t('faq.clear')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
          {/* Main Content Layout */}
          <section className="w-full max-w-container-max-width mx-auto px-margin-desktop py-[64px] flex flex-col md:flex-row gap-gutter">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-[280px] shrink-0">
              <div className="sticky top-[100px] bg-surface-container-lowest rounded-xl p-stack-md shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-surface-container-high">
                <h3 className="font-label-sm text-label-sm text-on-surface-variant mb-stack-sm px-3 tracking-widest uppercase">{t('faq.categoriesHeader')}</h3>
                <Stagger whenInView as="nav" className="flex flex-col gap-1" delayChildren={0.05} staggerChildren={0.05}>
                  {FAQ_DATA.map((cat) => (
                    <Stagger.Item
                      key={cat.id}
                      as="a"
                      className={`flex items-center justify-between px-3 py-2 font-body-md rounded-lg transition-colors border-s-4 cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-surface-container-low text-primary font-semibold border-[#2563EB]'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary border-transparent'
                      }`}
                      href={`#${cat.id}`}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {t(`faq.categories.${cat.id}`)}
                      {activeCategory === cat.id && (
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      )}
                    </Stagger.Item>
                  ))}
                </Stagger>
              </div>
            </aside>
            {/* FAQ Accordion Content */}
            <div className="flex-grow max-w-[800px]">
              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-outline text-[48px] mb-4">search_off</span>
                  <p className="font-h3 text-h3 text-primary mb-2">{t('faq.noResults')}</p>
                  <p className="font-body-md text-on-surface-variant">{t('faq.noResultsHelp')}</p>
                </div>
              )}
              {filteredData.map((cat) => (
                <div key={cat.id} className="mb-12 scroll-mt-[100px]" id={cat.id}>
                  <h2 className="font-h2 text-h2 text-primary mb-stack-md border-b border-surface-container-high pb-2">{t(`faq.categories.${cat.id}`)}</h2>
                  <div className="flex flex-col gap-4">
                    {cat.items.map((itemKey, idx) => {
                      const key = `${cat.id}-${idx}`;
                      const isOpen = openItem === key;
                      const tip = t(`faq.items.${itemKey}.tip`, { defaultValue: '' });
                      const answerContent = (
                        <>
                          <p className="font-body-md text-body-md text-on-surface-variant mb-4">{t(`faq.items.${itemKey}.a`)}</p>
                          {tip && (
                            <div className="bg-surface-container-low p-4 rounded-lg flex items-start gap-3">
                              <span className="material-symbols-outlined text-[#3B82F6] mt-0.5">info</span>
                              <p className="font-body-md text-body-md text-on-surface text-sm">{tip}</p>
                            </div>
                          )}
                        </>
                      );

                      return (
                        <div key={key} className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-surface-container-high overflow-hidden">
                          <button
                            className="w-full text-start px-stack-lg py-5 flex items-center justify-between bg-surface-container-lowest hover:bg-surface-container-low transition-colors group"
                            onClick={() => toggleItem(key)}
                          >
                            <span className="font-h3 text-h3 text-primary group-hover:text-[#2563EB] transition-colors">{t(`faq.items.${itemKey}.q`)}</span>
                            <span className={`material-symbols-outlined text-outline transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                          {reduce ? (
                            isOpen && (
                              <div className="px-stack-lg pb-6 pt-2 border-t border-surface-container-low">
                                {answerContent}
                              </div>
                            )
                          ) : (
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  className="overflow-hidden border-t border-surface-container-low"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: EASE }}
                                >
                                  <div className="px-stack-lg pb-6 pt-2">
                                    {answerContent}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {/* CTA Section */}
          <section className="w-full bg-surface-container-low py-[64px] px-margin-desktop flex flex-col items-center justify-center mt-auto border-t border-surface-container-high">
            <div className="max-w-[600px] text-center bg-surface-container-lowest p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-outline-variant relative overflow-hidden">
              <div className="absolute -top-10 -end-10 text-surface-container-high opacity-20 transform rotate-12">
                <span className="material-symbols-outlined text-[120px]">help_center</span>
              </div>
              <h2 className="font-h2 text-h2 text-primary mb-2 relative z-10">{t('faq.ctaTitle')}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6 relative z-10">{t('faq.ctaDescription')}</p>
              <Link className="px-6 py-3 bg-transparent border border-outline text-primary font-body-md font-bold rounded-lg hover:bg-surface-container transition-colors relative z-10 flex items-center gap-2 mx-auto w-fit" to={ROUTES.CONTACT}>
                <span className="material-symbols-outlined text-[20px]">mail</span> {t('faq.contactSupport')}
              </Link>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </div>
  );
}
