import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PublicNavBar from '../../components/PublicNavBar';
import PublicFooter from '../../components/PublicFooter';
import { getPublicJobs } from '../../services/publicDataService';
import Reveal from '../../motion/Reveal';
import Stagger from '../../motion/Stagger';

export default function SalariesPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  useEffect(() => {
    getPublicJobs().then(data => {
      setJobs(data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const salaryData = useMemo(() => {
    const filtered = jobs.filter(job => {
      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const matchesTitle = job.title?.toLowerCase().includes(s);
        const matchesSkill = job.requiredSkills?.some(skill => skill.toLowerCase().includes(s));
        if (!matchesTitle && !matchesSkill) return false;
      }
      if (locationQuery) {
        const l = locationQuery.toLowerCase();
        if (!job.location?.toLowerCase().includes(l)) return false;
      }
      return true;
    });

    const groups = {};
    filtered.forEach(job => {
      if (!job.salaryMin && !job.salaryMax) return;

      const role = job.title?.trim() || 'Other';
      const roleKey = role.toLowerCase();

      if (!groups[roleKey]) {
        groups[roleKey] = { role, minSum: 0, maxSum: 0, count: 0 };
      }

      const min = job.salaryMin || job.salaryMax;
      const max = job.salaryMax || job.salaryMin;

      groups[roleKey].minSum += min;
      groups[roleKey].maxSum += max;
      groups[roleKey].count += 1;
    });

    const result = Object.values(groups).map(g => {
      const avgMin = Math.round(g.minSum / g.count);
      const avgMax = Math.round(g.maxSum / g.count);

      const formatNum = (num) => {
        if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
        return `$${num}`;
      };

      const trendKey = g.count > 2 ? 'highDemand' : (g.count === 1 ? 'new' : 'stable');

      return {
        role: g.role,
        range: `${formatNum(avgMin)} - ${formatNum(avgMax)}`,
        trend: t(`salariesPage.trends.${trendKey}`),
        count: g.count
      };
    });

    return result.sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));
  }, [jobs, searchQuery, locationQuery, t]);

  return (
    <div className="stitch-page bg-background text-on-background font-body-md text-body-md min-h-screen">
      <PublicNavBar />

      <main className="max-w-container mx-auto px-gutter py-margin-desktop space-y-gutter">
        <Reveal whenInView as="section" className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-ambient border border-outline-variant">
          <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary mb-stack-sm">{t('salariesPage.eyebrow')}</p>
          <h1 className="font-display text-display text-primary mb-stack-sm">{t('salariesPage.title')}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
            {t('salariesPage.description')}
          </p>
          <div className="mt-gutter grid grid-cols-1 md:grid-cols-[1fr_220px] gap-stack-md">
            <label className="relative">
              <span className="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg ps-12 pe-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
                placeholder={t('salariesPage.searchJobPlaceholder')}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>
            <label className="relative">
              <span className="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant">location_on</span>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg ps-12 pe-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
                placeholder={t('salariesPage.searchLocationPlaceholder')}
                type="search"
                value={locationQuery}
                onChange={e => setLocationQuery(e.target.value)}
              />
            </label>
          </div>
        </Reveal>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="material-symbols-outlined animate-spin text-[48px] text-secondary">progress_activity</span>
          </div>
        ) : salaryData.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-outline text-[48px] mb-4">analytics</span>
            <h3 className="font-h3 text-h3 text-primary mb-2">{t('salariesPage.emptyTitle')}</h3>
            <p className="text-on-surface-variant">{t('salariesPage.emptyHelp')}</p>
          </div>
        ) : (
          <Stagger whenInView as="section" className="grid grid-cols-1 md:grid-cols-3 gap-gutter" delayChildren={0.08} staggerChildren={0.07}>
            {salaryData.map((item, index) => (
              <Stagger.Item key={index} className="h-full">
                <article className="h-full bg-surface-container-lowest rounded-xl p-stack-lg border border-outline-variant shadow-ambient hover:shadow-hover hover:-translate-y-1 transition-all">
                  <div className="flex items-center justify-between mb-stack-md">
                    <span className="material-symbols-outlined text-secondary">payments</span>
                    <span className="font-label-md text-label-md text-white bg-secondary-container px-stack-sm py-unit rounded-full">{item.trend}</span>
                  </div>
                  <h2 className="font-h2 text-h2 text-primary">{item.role}</h2>
                  <p className="font-display text-[32px] leading-tight text-primary mt-stack-md">{item.range}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-unit">{t('salariesPage.basedOn', { count: item.count })}</p>
                </article>
              </Stagger.Item>
            ))}
          </Stagger>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
