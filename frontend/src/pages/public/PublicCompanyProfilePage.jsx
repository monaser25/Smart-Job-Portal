import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../utils/constants';
import PublicNavBar from '../../components/PublicNavBar';
import { getPublicCompanyById, getPublicJobs } from '../../services/publicDataService';
import { useAuth } from '../../context/useAuth';
import { useToast } from '../../components/useToast';
import Reveal from '../../motion/Reveal';
import Stagger from '../../motion/Stagger';

import PublicFooter from '../../components/PublicFooter';

const formatJobType = (value = '') => String(value || 'full_time')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatSalary = (job) => {
  const min = Number(job?.salaryMin || 0);
  const max = Number(job?.salaryMax || 0);
  const currency = job?.currency === 'USD' || !job?.currency ? '$' : job.currency;

  if (!min && !max) return '';
  if (min && max) return `${Math.round(min / 1000)}K ${currency} - ${Math.round(max / 1000)}K ${currency}`;
  return `${Math.round((min || max) / 1000)}K ${currency}`;
};

const displayUrl = (value = '') => String(value).replace(/^https?:\/\//, '').replace(/\/$/, '');

const websiteHref = (value = '') => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

export default function PublicCompanyProfilePage() {
  const { t } = useTranslation();
  const { companyId } = useParams();
  const id = companyId;
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'company' && String(user.profile?.id) === String(company?.id);

  const formatPostedDate = (value) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? t('companyDetails.recentlyPosted') : date.toLocaleDateString();
  };

  useEffect(() => {
    const fetchCompanyAndJobs = async () => {
      try {
        const data = await getPublicCompanyById(id);
        if (data && data.company) {
          setCompany(data.company);
          setJobs(data.activeJobs || []);
        } else {
          setCompany(data);

          try {
            const jobsData = await getPublicJobs({ company_id: id });
            const companyJobs = jobsData.filter(j => String(j.companyId) === String(id) || String(j.company) === String(data.name));
            setJobs(companyJobs);
          } catch (e) {
            console.error("Failed to fetch company jobs", e);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyAndJobs();
  }, [id]);

  const handleCompanyAlertClick = () => {
    const openJobsCount = jobs.length || Number(company?.openPositions || 0);

    addToast({
      title: openJobsCount
        ? t('companyDetails.toastHasJobs', { name: company.name })
        : t('companyDetails.toastNoJobs', { name: company.name }),
      message: openJobsCount
        ? t('companyDetails.toastHasJobsMessage', { name: company.name, count: openJobsCount })
        : t('companyDetails.toastNoJobsMessage', { name: company.name }),
      type: openJobsCount ? 'success' : 'info',
    });
  };

  if (loading) return (
    <div className="stitch-page bg-background flex flex-col min-h-screen">
      <div className="flex-1 flex justify-center items-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-secondary">progress_activity</span>
      </div>
    </div>
  );

  if (!company) return (
    <div className="stitch-page bg-background flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col justify-center items-center gap-4">
        <span className="material-symbols-outlined text-[64px] text-outline">domain_disabled</span>
        <p className="text-on-surface-variant font-body-lg">{t('companyDetails.notFound')}</p>
        <Link to={ROUTES.COMPANIES} className="px-6 py-2 bg-secondary text-on-secondary rounded-lg font-bold">{t('companyDetails.browseCompanies')}</Link>
      </div>
    </div>
  );

  return (
    <div className="stitch-page bg-background text-on-background font-body-md flex flex-col min-h-screen">
      <PublicNavBar />

      {isAdmin && (
        <div className="bg-error-container text-on-error-container w-full py-2 px-4 flex items-center justify-between shadow-sm z-40">
          <div className="flex items-center gap-2 font-bold font-body-sm">
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            {t('companyDetails.admin.controls')}
          </div>
          <div className="flex gap-2">
            <Link to={`/admin/users/${id}`} className="bg-surface text-primary px-3 py-1 rounded-md text-xs font-bold hover:bg-surface-container transition-colors border border-outline-variant">
              {t('companyDetails.admin.viewDashboard')}
            </Link>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="bg-secondary-container text-on-secondary-container w-full py-2 px-4 flex items-center justify-between shadow-sm z-40">
          <div className="flex items-center gap-2 font-bold font-body-sm">
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            {t('companyDetails.owner.viewMode')}
          </div>
          <div className="flex gap-2">
            <Link to={ROUTES.COMPANY_PROFILE + '/edit'} className="bg-surface text-primary px-3 py-1 rounded-md text-xs font-bold hover:bg-surface-container transition-colors border border-outline-variant">
              {t('companyDetails.owner.editProfile')}
            </Link>
            <Link to={ROUTES.COMPANY_CREATE_JOB} className="bg-secondary text-on-secondary px-3 py-1 rounded-md text-xs font-bold hover:opacity-90 transition-opacity">
              {t('companyDetails.owner.postJob')}
            </Link>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-grow space-y-gutter px-gutter py-margin-desktop lg:px-margin-desktop">
        <Reveal whenInView as="nav" className="flex items-center gap-2 text-on-surface-variant font-body-md mb-6">
          <Link className="hover:text-secondary transition-colors" to={ROUTES.COMPANIES}>{t('companyDetails.breadcrumb')}</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-primary font-semibold">{company.name}</span>
        </Reveal>

        <Reveal whenInView as="section" className="bg-surface-container-lowest rounded-xl p-stack-xl shadow-ambient border border-outline-variant flex flex-col md:flex-row items-start md:items-center gap-stack-lg relative overflow-hidden">
          <div className="absolute top-0 end-0 p-8 opacity-5 transform translate-x-1/4 -translate-y-1/4 pointer-events-none">
            <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: '"FILL" 1' }}>domain</span>
          </div>

          <div className="w-28 h-28 rounded-2xl bg-surface border border-outline-variant flex items-center justify-center p-3 shrink-0 z-10 overflow-hidden shadow-sm">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
            ) : (
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">domain</span>
            )}
          </div>

          <div className="flex-grow z-10">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-display text-primary">{company.name}</h1>
              <button
                aria-label={t('companyDetails.checkAria', { name: company.name })}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                onClick={handleCompanyAlertClick}
                title={t('companyDetails.checkUpdates')}
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">{jobs.length ? 'notifications_active' : 'notifications'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-on-surface-variant font-body-md">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">category</span> {company.industry}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">location_on</span> {company.location}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">work</span> {t('companyDetails.openPositionsCount', { count: jobs.length || company.openPositions })}</span>
              {company.employees && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">group</span> {t('companyDetails.employeesCount', { count: company.employees })}</span>}
              {company.website && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">language</span> <a href={websiteHref(company.website)} target="_blank" rel="noreferrer" className="text-secondary hover:underline text-body-sm">{displayUrl(company.website)}</a></span>}
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-gutter">
            <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-ambient border border-outline-variant">
              <h2 className="font-h2 text-h2 text-primary mb-stack-md">{t('companyDetails.aboutTitle', { name: company.name })}</h2>
              <p className="font-body-lg text-on-surface-variant whitespace-pre-wrap">{company.description || t('companyDetails.noDescription')}</p>
            </section>

            <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-ambient border border-outline-variant">
              <div className="flex flex-col gap-2 mb-stack-md sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">{t('companyDetails.hiringNow')}</p>
                  <h2 className="font-h2 text-h2 text-primary">{t('companyDetails.openPositionsHeader', { count: jobs.length })}</h2>
                </div>
                {isOwner && (
                  <Link to={ROUTES.COMPANY_JOBS} className="inline-flex items-center gap-1 text-secondary text-sm font-semibold hover:underline">
                    {t('companyDetails.manageJobs')}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                )}
              </div>

              {jobs.length ? (
                <Stagger whenInView className="grid grid-cols-1 gap-4" delayChildren={0.06} staggerChildren={0.06}>
                  {jobs.map((job) => {
                    const salary = formatSalary(job);
                    const skills = job.requiredSkills || [];

                    return (
                      <Stagger.Item key={job.id}>
                        <Link to={`/jobs/${job.id}`} className="group block rounded-xl border border-outline-variant bg-surface-container-low p-5 transition-colors hover:border-secondary hover:bg-surface-container-high">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-secondary-container px-3 py-1 font-label-sm text-label-sm text-on-secondary-container">{job.category ? t(`categories.${job.category}`, { defaultValue: job.category }) : t('companyDetails.defaultCategory')}</span>
                                <span className="text-outline text-xs">{t('companyDetails.postedAt', { date: formatPostedDate(job.postedAt) })}</span>
                              </div>
                              <h3 className="font-h3 text-h3 text-primary transition-colors group-hover:text-secondary">{job.title}</h3>
                              {job.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{job.description}</p>}
                            </div>
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-secondary opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-on-surface-variant">
                            <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-3 py-1 text-sm"><span className="material-symbols-outlined text-[16px]">location_on</span>{job.location}</span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-3 py-1 text-sm"><span className="material-symbols-outlined text-[16px]">schedule</span>{formatJobType(job.type)}</span>
                            {job.workMode && <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-3 py-1 text-sm"><span className="material-symbols-outlined text-[16px]">hub</span>{job.workMode}</span>}
                            {salary && <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface px-3 py-1 text-sm"><span className="material-symbols-outlined text-[16px]">payments</span>{salary}</span>}
                          </div>

                          {skills.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant border border-outline-variant">{skill}</span>)}
                              {skills.length > 5 && <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant border border-outline-variant">{t('companyDetails.moreSkills', { count: skills.length - 5 })}</span>}
                            </div>
                          )}
                        </Link>
                      </Stagger.Item>
                    );
                  })}
                </Stagger>
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
                  <span className="material-symbols-outlined text-[42px] text-outline">work_off</span>
                  <h3 className="mt-2 font-h3 text-primary">{t('companyDetails.noPositionsTitle')}</h3>
                  <p className="mt-1 text-on-surface-variant">{t('companyDetails.noPositionsHint', { name: company.name })}</p>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-gutter">
            <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-ambient border border-outline-variant">
              <h2 className="font-h3 text-h3 text-primary mb-stack-md flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">business_center</span>
                {t('companyDetails.snapshotTitle')}
              </h2>
              <div className="space-y-3 text-on-surface-variant">
                <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3">
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">category</span>{t('companyDetails.snapshot.industry')}</span>
                  <span className="font-semibold text-primary text-end">{company.industry}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3">
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">location_on</span>{t('companyDetails.snapshot.location')}</span>
                  <span className="font-semibold text-primary text-end">{company.location}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3">
                  <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">work</span>{t('companyDetails.snapshot.openRoles')}</span>
                  <span className="font-semibold text-primary text-end">{jobs.length || company.openPositions}</span>
                </div>
                {company.website && (
                  <a className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3 transition-colors hover:text-secondary" href={websiteHref(company.website)} target="_blank" rel="noreferrer">
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">language</span>{t('companyDetails.snapshot.website')}</span>
                    <span className="font-semibold text-primary text-end">{displayUrl(company.website)}</span>
                  </a>
                )}
              </div>
            </section>

            {company.benefits?.length > 0 && (
              <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-ambient border border-outline-variant">
                <h2 className="font-h3 text-h3 text-primary mb-stack-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">verified</span>
                  {t('companyDetails.benefitsTitle')}
                </h2>
                <ul className="space-y-3">
                  {company.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-on-surface-variant font-body-md">
                      <span className="material-symbols-outlined text-[18px] text-success shrink-0 mt-0.5">check_circle</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
