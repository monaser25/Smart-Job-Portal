import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../utils/constants';
import Reveal from '../../motion/Reveal';
import Stagger from '../../motion/Stagger';
import AnimatedCounter from '../../motion/AnimatedCounter';
import Typewriter from '../../motion/Typewriter';
import PublicNavBar from '../../components/PublicNavBar';
import PublicFooter from '../../components/PublicFooter';
import { EASE, SPRING_PRESS } from '../../motion/variants';
import { getPublicJobs, getPublicCompanies } from '../../services/publicDataService';

const HOW_IT_WORKS = [
  { step: '01', icon: 'upload_file', key: 'upload' },
  { step: '02', icon: 'auto_awesome', key: 'match' },
  { step: '03', icon: 'handshake', key: 'apply' },
];

const CATEGORY_CARD_HOVER = {
  rest: { y: 0 },
  hover: { y: -8, transition: { duration: 0.28, ease: EASE } },
};

const CATEGORY_ICON_HOVER = {
  rest: { scale: 1, rotate: 0 },
  hover: { scale: 1.08, rotate: -3, transition: { duration: 0.32, ease: EASE } },
};

export default function HomePage() {
  const { t } = useTranslation();
  const [jobQuery, setJobQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const translatedTypingPhrases = t('home.heroTypingPhrases', { returnObjects: true });
  const heroTypingPhrases = Array.isArray(translatedTypingPhrases)
    ? translatedTypingPhrases
    : [t('home.heroTitleLine2')];

  const jobInputRef = useRef(null);
  const locationInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getPublicJobs(),
      getPublicCompanies()
    ]).then(([jobsData, companiesData]) => {
      setJobs(jobsData || []);
      setCompaniesCount((companiesData || []).length);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const { uniqueTitles, uniqueLocations, popularSearches } = useMemo(() => {
    const titleCounts = {};
    const locSet = new Set();
    
    jobs.forEach(job => {
      const title = job.title?.trim();
      if (title) {
        titleCounts[title] = (titleCounts[title] || 0) + 1;
      }

      if (job.location && job.location !== 'Remote') {
        locSet.add(job.location.trim());
      }
    });

    const sortedTitles = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    return {
      uniqueTitles: sortedTitles,
      uniqueLocations: Array.from(locSet).sort(),
      popularSearches: sortedTitles.length > 0 
        ? sortedTitles.slice(0, 4)
        : []
    };
  }, [jobs]);

  const dynamicStats = useMemo(() => {
    return [
      { value: jobs.length || 0, suffix: '', label: t('home.stats.activeJobs'), icon: 'work' },
      { value: companiesCount || 0, suffix: '', label: t('home.stats.topCompanies'), icon: 'apartment' },
      { value: uniqueLocations.length || 0, suffix: '', label: t('home.stats.availableLocations'), icon: 'location_on' },
    ];
  }, [jobs.length, companiesCount, uniqueLocations.length, t]);

  const dynamicCategories = useMemo(() => {
    if (loading) return [];

    const categoryCounts = {};
    jobs.forEach(job => {
      const cat = job.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const iconMap = {
      'Engineering': 'code',
      'Design': 'palette',
      'Marketing': 'campaign',
      'Data Science': 'analytics',
      'Finance': 'account_balance',
      'Customer Success': 'support_agent',
      'Operations': 'inventory_2',
      'Human Resources': 'groups',
      'Other': 'category',
    };

    const sortedCats = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        icon: iconMap[label] || 'work',
        label,
        displayLabel: t(`categories.${label}`, { defaultValue: label }),
        count: t('home.categories.jobCount', { count }),
      }));

    return sortedCats.slice(0, 8); // Top 8
  }, [jobs, loading, t]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (jobInputRef.current && !jobInputRef.current.contains(e.target)) {
        setShowJobSuggestions(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(e.target)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredJobs = useMemo(() => {
    if (!jobQuery) return [];
    const q = jobQuery.toLowerCase();
    return uniqueTitles.filter(t => t.toLowerCase().includes(q)).slice(0, 6);
  }, [jobQuery, uniqueTitles]);

  const filteredLocations = useMemo(() => {
    if (!locationQuery) return [];
    const q = locationQuery.toLowerCase();
    return uniqueLocations.filter(l => l.toLowerCase().includes(q)).slice(0, 6);
  }, [locationQuery, uniqueLocations]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (jobQuery) params.append('search', jobQuery);
    if (locationQuery) params.append('location', locationQuery);
    navigate({ pathname: ROUTES.JOBS, search: params.toString() });
  };

  return (
    <div className="stitch-page bg-background text-on-background font-body-md flex flex-col min-h-screen">
      <div>
        <PublicNavBar />

        <main className="flex-grow flex flex-col items-center w-full">
          {/* Hero Section */}
          <section className="w-full bg-surface-container-lowest py-[100px] px-4 sm:px-gutter lg:px-margin-desktop flex flex-col items-center justify-center border-b border-surface-container-high relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #131b2e 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            {/* Decorative gradient blobs — gently float so the hero feels alive. */}
            <motion.div
              aria-hidden="true"
              className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none"
              style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
              animate={reduce ? undefined : { y: [0, -18, 0] }}
              transition={reduce ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
              style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }}
              animate={reduce ? undefined : { y: [0, 14, 0] }}
              transition={reduce ? undefined : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />

            <Stagger className="max-w-[860px] w-full text-center relative z-10" delayChildren={0.05} staggerChildren={0.08}>
                <Stagger.Item>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/10 text-secondary dark:text-secondary-fixed rounded-full font-label-sm text-label-sm uppercase tracking-wider mb-6 border border-secondary/20">
                    <span className="material-symbols-outlined text-[16px]" data-weight="fill" aria-hidden="true">auto_awesome</span>
                    {t('home.heroBadge')}
                  </div>
                </Stagger.Item>

              <Stagger.Item as="h1">
                <span className="block font-h1 text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-primary mb-stack-md leading-[1.05] tracking-tight">
                  {t('home.heroTitleLine1')}<br />
                  <Typewriter
                    phrases={heroTypingPhrases}
                    className="inline-block min-h-[1.05em]"
                    caretClassName="text-secondary dark:text-secondary-fixed"
                  />
                </span>
              </Stagger.Item>

              <Stagger.Item as="p">
                <span className="block font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-[640px] mx-auto leading-relaxed">
                  {t('home.heroDescription')}
                </span>
              </Stagger.Item>

              <Stagger.Item>
                <form onSubmit={handleSearch} className="w-full max-w-[760px] mx-auto bg-surface-container-lowest/90 border border-outline-variant/80 rounded-2xl md:rounded-full shadow-md backdrop-blur-xl flex flex-col md:flex-row items-stretch p-2 focus-within:border-secondary focus-within:shadow-hover transition-all duration-300 ease-out gap-2 md:gap-0">
                  <div className="flex-1 flex items-center gap-2 px-4 relative bg-surface-container-lowest md:bg-transparent rounded-xl md:rounded-none py-2 md:py-0" ref={jobInputRef}>
                    <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">search</span>
                    <input
                      className="w-full bg-transparent border-0 outline-none font-body-lg text-body-lg text-on-surface placeholder-on-surface-variant py-2 md:py-3"
                      placeholder={t('home.searchJobPlaceholder')}
                      type="text"
                      value={jobQuery}
                      onChange={(e) => {
                        setJobQuery(e.target.value);
                        setShowJobSuggestions(true);
                      }}
                      onFocus={() => setShowJobSuggestions(true)}
                    />
                    {showJobSuggestions && filteredJobs.length > 0 && (
                      <ul className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-hover overflow-hidden z-50 py-2">
                        {filteredJobs.map(suggestion => (
                          <li 
                            key={suggestion} 
                            className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-on-surface transition-colors flex items-center gap-3"
                            onClick={() => {
                              setJobQuery(suggestion);
                              setShowJobSuggestions(false);
                            }}
                          >
                            <span className="material-symbols-outlined text-outline-variant text-[18px]">search</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="w-full md:w-px h-px md:h-8 bg-outline-variant hidden md:block"></div>
                  <div className="flex-1 items-center gap-2 px-4 flex relative bg-surface-container-lowest md:bg-transparent rounded-xl md:rounded-none py-2 md:py-0" ref={locationInputRef}>
                    <span className="material-symbols-outlined text-outline text-[20px]" aria-hidden="true">location_on</span>
                    <input
                      className="w-full bg-transparent border-0 outline-none font-body-lg text-body-lg text-on-surface placeholder-on-surface-variant py-2 md:py-3"
                      placeholder={t('home.searchLocationPlaceholder')}
                      type="text"
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        setShowLocationSuggestions(true);
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                    />
                    {showLocationSuggestions && filteredLocations.length > 0 && (
                      <ul className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-hover overflow-hidden z-50 py-2">
                        {filteredLocations.map(suggestion => (
                          <li 
                            key={suggestion} 
                            className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-on-surface transition-colors flex items-center gap-3"
                            onClick={() => {
                              setLocationQuery(suggestion);
                              setShowLocationSuggestions(false);
                            }}
                          >
                            <span className="material-symbols-outlined text-outline-variant text-[18px]">location_on</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                    whileTap={reduce ? undefined : { scale: 0.96, transition: SPRING_PRESS }}
                    className="w-full md:w-auto px-8 py-3 bg-secondary text-on-secondary font-body-md font-bold rounded-xl md:rounded-full shadow-sm hover:bg-secondary-container hover:shadow-hover transition-all duration-300 ease-out whitespace-nowrap mt-2 md:mt-0"
                  >
                    {t('home.searchSubmit')}
                  </motion.button>
                </form>
              </Stagger.Item>

              <Stagger.Item>
                <div className="mt-6 flex items-center justify-center gap-2 flex-wrap text-on-surface-variant font-body-md">
                  <span className="text-outline dark:text-white">{t('home.popular')}</span>
                  {popularSearches.map((term) => (
                    <motion.div
                      key={term}
                      whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                      whileTap={reduce ? undefined : { scale: 0.96, transition: SPRING_PRESS }}
                    >
                      <Link to={`${ROUTES.JOBS}?search=${encodeURIComponent(term)}`} className="px-3 py-1 rounded-full border border-outline-variant hover:border-secondary hover:text-secondary dark:hover:text-secondary-fixed dark:hover:border-secondary-fixed transition-all duration-200 ease-out text-sm">
                        {term}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </Stagger.Item>
            </Stagger>
          </section>

          {/* Stats Section */}
          <section className="w-full max-w-container-max-width mx-auto px-margin-desktop py-[48px]">
            <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[720px] mx-auto" delayChildren={0.05} staggerChildren={0.1}>
              {dynamicStats.map((stat) => (
                <Stagger.Item
                  key={stat.label}
                  className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-ambient transition-shadow"
                  whileHover={reduce ? undefined : { y: -4, boxShadow: '0px 14px 40px rgba(15,23,42,0.12)', transition: { duration: 0.25, ease: EASE } }}
                >
                  <span className="material-symbols-outlined text-secondary text-[28px] mb-2" aria-hidden="true">{stat.icon}</span>
                  <p className="font-h1 text-h1 text-primary">
                    {loading ? (
                      <span className="animate-pulse text-outline-variant">...</span>
                    ) : (
                      <>
                        <AnimatedCounter value={stat.value} />
                        <span aria-hidden="true">{stat.suffix}</span>
                      </>
                    )}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">{stat.label}</p>
                </Stagger.Item>
              ))}
            </Stagger>
          </section>

          {/* How It Works Section */}
          <section className="w-full bg-surface-container-low py-[80px] px-margin-desktop border-t border-b border-surface-container-high">
            <div className="max-w-container-max-width mx-auto">
              <Reveal whenInView className="text-center mb-12">
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-2">{t('home.howItWorks.eyebrow')}</p>
                <h2 className="font-h1 text-h1 text-primary mb-stack-sm">{t('home.howItWorks.title')}</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[560px] mx-auto">{t('home.howItWorks.description')}</p>
              </Reveal>
              <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1000px] mx-auto" delayChildren={0.1} staggerChildren={0.1}>
                {HOW_IT_WORKS.map((item) => (
                  <Stagger.Item
                    key={item.step}
                    className="relative bg-surface-container-lowest rounded-xl p-8 border border-surface-container-high shadow-ambient transition-all group"
                    whileHover={reduce ? undefined : { y: -6, boxShadow: '0px 14px 40px rgba(15,23,42,0.12)', transition: { duration: 0.25, ease: EASE } }}
                  >
                    <div className="absolute -top-4 start-8 px-3 py-1 bg-secondary text-on-secondary font-label-sm text-label-sm rounded-full">
                      {t('home.howItWorks.stepLabel')} {item.step}
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-5 mt-2 group-hover:bg-secondary transition-colors">
                      <span className="material-symbols-outlined text-secondary text-[28px] group-hover:text-on-secondary transition-colors" aria-hidden="true">{item.icon}</span>
                    </div>
                    <h3 className="font-h3 text-h3 text-primary mb-2">{t(`home.howItWorks.steps.${item.key}.title`)}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{t(`home.howItWorks.steps.${item.key}.description`)}</p>
                  </Stagger.Item>
                ))}
              </Stagger>
            </div>
          </section>

          {/* Featured Categories Section */}
          <Reveal whenInView as="section" className="relative w-full overflow-hidden bg-gradient-to-b from-surface-container-lowest via-surface-container-low/50 to-surface-container-lowest px-4 py-16 sm:px-gutter lg:px-margin-desktop lg:py-[96px]">
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-[8%] top-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl"
              animate={reduce ? undefined : { y: [0, -14, 0], opacity: [0.75, 1, 0.75] }}
              transition={reduce ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[-140px] right-[6%] h-[360px] w-[360px] rounded-full bg-tertiary/10 blur-3xl"
              animate={reduce ? undefined : { y: [0, 16, 0], opacity: [0.65, 0.95, 0.65] }}
              transition={reduce ? undefined : { duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-outline-variant to-transparent" />

            <div className="relative max-w-container-max-width mx-auto">
              <Reveal whenInView className="text-center mb-12 md:mb-14">
                <div aria-hidden="true" className="mx-auto mb-4 h-px w-24 bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary mb-3">{t('home.categories.eyebrow')}</p>
                <h2 className="font-h1 text-h1 text-primary mb-stack-sm">{t('home.categories.title')}</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px] mx-auto leading-relaxed">{t('home.categories.description')}</p>
              </Reveal>

              <Stagger whenInView className="home-category-grid" delayChildren={0.1} staggerChildren={0.07}>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <Stagger.Item key={i}>
                      <div className="relative flex min-h-[220px] overflow-hidden rounded-[1.75rem] border border-outline-variant/70 bg-surface-container-lowest/80 p-7 text-center shadow-ambient backdrop-blur-xl motion-safe:animate-pulse flex-col items-center justify-center">
                        <div className="mb-5 h-16 w-16 rounded-2xl bg-surface-container-high" />
                        <div className="mb-3 h-4 w-2/3 rounded-full bg-surface-container-high" />
                        <div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
                      </div>
                    </Stagger.Item>
                  ))
                ) : dynamicCategories.length === 0 ? (
                  <Stagger.Item className="home-category-empty">
                    <div className="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-lowest/80 px-6 py-10 text-center text-on-surface-variant shadow-ambient backdrop-blur-xl">
                      <span className="material-symbols-outlined mb-3 text-[32px] text-secondary" aria-hidden="true">category</span>
                      <p className="font-body-lg text-body-lg">{t('home.categories.empty')}</p>
                    </div>
                  </Stagger.Item>
                ) : (
                  dynamicCategories.map((cat) => (
                    <Stagger.Item key={cat.label}>
                      <motion.div
                        className="h-full rounded-[1.75rem]"
                        initial="rest"
                        animate="rest"
                        whileHover={reduce ? undefined : 'hover'}
                        variants={reduce ? undefined : CATEGORY_CARD_HOVER}
                      >
                        <Link
                          to={`${ROUTES.JOBS}?category=${encodeURIComponent(cat.label)}`}
                          className="group relative flex h-full min-h-[220px] overflow-hidden rounded-[1.75rem] border border-outline-variant/70 bg-surface-container-lowest/85 p-7 text-center shadow-ambient backdrop-blur-xl outline-none transition-all duration-300 ease-out hover:border-secondary/70 hover:shadow-hover focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 flex-col items-center justify-center"
                        >
                          <span aria-hidden="true" className="pointer-events-none absolute inset-px rounded-[1.65rem] bg-gradient-to-br from-white/70 via-transparent to-secondary/10 opacity-70 transition-opacity duration-300 group-hover:opacity-100 dark:from-white/5 dark:to-secondary/15" />
                          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-4 h-24 w-24 -translate-x-1/2 rounded-full bg-secondary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

                          <motion.div
                            className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 ring-1 ring-secondary/15 shadow-sm transition-colors duration-300 group-hover:bg-secondary group-hover:ring-secondary/30 group-hover:shadow-hover"
                            variants={reduce ? undefined : CATEGORY_ICON_HOVER}
                          >
                            <span className="material-symbols-outlined text-secondary text-[30px] transition-colors duration-300 group-hover:text-on-secondary" aria-hidden="true">{cat.icon}</span>
                          </motion.div>

                          <h3 className="relative font-h3 text-h3 text-primary mb-2 line-clamp-2">{cat.displayLabel}</h3>
                          <p className="relative font-label-sm text-label-sm text-on-surface-variant">{cat.count}</p>
                          <span aria-hidden="true" className="relative mt-5 h-1 w-10 rounded-full bg-secondary/20 transition-all duration-300 group-hover:w-16 group-hover:bg-secondary/50" />
                        </Link>
                      </motion.div>
                    </Stagger.Item>
                  ))
                )}
              </Stagger>
            </div>
          </Reveal>

          {/* CTA Section */}
          <Reveal whenInView as="section" className="w-full bg-primary-container py-[80px] px-margin-desktop">
            <div className="max-w-[680px] mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-on-primary-fixed-variant/30 font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider mb-6">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">rocket_launch</span>
                {t('home.cta.badge')}
              </div>
              <h2 className="font-h1 text-h1 text-on-secondary-container mb-stack-md">
                {t('home.cta.title')}
              </h2>
              <p className="font-body-lg text-body-lg text-secondary-fixed mb-8 max-w-[520px] mx-auto">
                {t('home.cta.description')}
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <motion.div whileTap={reduce ? undefined : { scale: 0.96, transition: SPRING_PRESS }}>
                  <Link to={ROUTES.REGISTER} className="inline-block px-8 py-3.5 bg-secondary text-on-secondary font-h3 text-h3 rounded-lg hover:bg-secondary-container transition-colors shadow-sm">
                    {t('home.cta.createAccount')}
                  </Link>
                </motion.div>
                <motion.div whileTap={reduce ? undefined : { scale: 0.96, transition: SPRING_PRESS }}>
                  <Link to={ROUTES.JOBS} className="inline-block px-8 py-3.5 bg-transparent border border-on-primary-fixed-variant/30 text-on-secondary-container font-h3 text-h3 rounded-lg hover:bg-on-primary-fixed-variant/10 transition-colors">
                    {t('home.cta.browseJobs')}
                  </Link>
                </motion.div>
              </div>
            </div>
          </Reveal>
        </main>
        <PublicFooter />
      </div>
    </div>
  );
}
