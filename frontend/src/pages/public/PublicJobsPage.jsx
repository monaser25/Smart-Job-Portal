import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PublicNavBar from '../../components/PublicNavBar';
import PublicFooter from '../../components/PublicFooter';
import SeekerEmptyState from '../../components/jobSeeker/SeekerEmptyState';
import SeekerJobCard from '../../components/jobSeeker/SeekerJobCard';
import Reveal from '../../motion/Reveal';
import Stagger from '../../motion/Stagger';
import { EASE, SPRING_PRESS } from '../../motion/variants';
import { jobsApi } from '../../api/jobsApi';
import { adminApi } from '../../api/adminApi';
import { useAuth } from '../../context/useAuth';
import { getRecommendedJobs } from '../../services/jobSeekerDataService';
import { normalizePublicJob } from '../../services/publicDataService';
import { normalizeApiError } from '../../utils/apiError';
import { filterJobs } from '../../utils/jobFilters';
import { ROUTES } from '../../utils/constants';

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Data Science', 'Finance', 'Customer Success', 'Operations', 'Human Resources', 'Other'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const EXPERIENCE_LEVELS = ['Internship', 'Entry Level / Junior', 'Mid Level', 'Senior', 'Lead / Manager', 'Director / Executive'];

const searchInputClass = 'w-full rounded-2xl border border-outline-variant/80 bg-surface-container-lowest/85 py-3.5 ps-12 pe-4 text-on-surface shadow-sm outline-none transition-all duration-300 ease-out placeholder:text-on-surface-variant hover:border-secondary/40 focus:border-secondary focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/25';
const filterOptionClass = 'group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 font-body-md text-body-md text-on-surface transition-all duration-200 ease-out hover:border-secondary/30 hover:bg-secondary/5 hover:text-secondary focus-within:border-secondary/60 focus-within:bg-secondary/5';
const filterCheckboxClass = 'mt-0.5 h-4 w-4 shrink-0 rounded accent-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30';

const TYPE_TO_BACKEND = {
  'Full-time': 'full_time',
  'Part-time': 'part_time',
  Contract: 'contract',
  Internship: 'internship',
  Remote: 'remote',
};

function JobListSkeleton({ loadingLabel }) {
  return (
    <div className="flex flex-col gap-4 md:gap-5" aria-busy="true" aria-live="polite">
      {[1, 2, 3].map((skeleton) => (
        <div key={skeleton} className="flex items-start gap-4 rounded-[1.5rem] border border-outline-variant/70 bg-surface-container-lowest/85 p-5 shadow-ambient backdrop-blur-xl motion-safe:animate-pulse sm:p-6">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-surface-container-high" />
          <div className="flex-grow">
            <div className="mb-2 h-6 w-2/3 rounded-full bg-surface-container-high sm:w-1/3" />
            <div className="mb-4 h-4 w-1/2 rounded-full bg-surface-container-high sm:w-1/4" />
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="h-7 w-20 rounded-full bg-surface-container-high" />
              <div className="h-7 w-20 rounded-full bg-surface-container-high" />
              <div className="h-7 w-20 rounded-full bg-surface-container-high" />
            </div>
            <div className="h-4 w-5/6 rounded-full bg-surface-container-high sm:w-2/3" />
          </div>
        </div>
      ))}
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}

export default function PublicJobsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const isAdmin = user?.role === 'admin';
  const isJobSeeker = user?.role === 'job_seeker';
  const initialFilters = {
    search: queryParams.get('search') || '',
    location: queryParams.get('location') || '',
  };
  const initialCategories = queryParams.get('category') ? [queryParams.get('category')] : [];

  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('all');
  const [recommendationNotice, setRecommendationNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialFilters.search);
  const [locationQuery, setLocationQuery] = useState(initialFilters.location);
  const [selectedCategories, setSelectedCategories] = useState(initialCategories);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState([]);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const jobInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const itemsPerPage = 10;

  useEffect(() => {
    let cancelled = false;

    const fetchJobs = async () => {
      setLoading(true);
      setError('');
      setErrorStatus(null);

      try {
        if (mode === 'recommended') {
          const recommendations = await getRecommendedJobs({ search: activeFilters.search });

          if (recommendations.needsCvUpload) {
            if (!cancelled) {
              setJobs([]);
              setMeta(null);
              setErrorStatus(403);
            }
            return;
          }

          const recommendedJobs = recommendations.map((recommendation) => ({
            ...recommendation.job,
            recommendation,
            matchScore: recommendation.matchScore || recommendation.job.matchScore,
          }));

          const filtered = filterJobs(recommendedJobs, {
            search: activeFilters.search,
            location: activeFilters.location,
            selectedTypes,
            selectedExperienceLevels,
          }).filter((job) => !selectedCategories.length || selectedCategories.includes(job.category));

          if (!cancelled) {
            setJobs(filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)));
            setMeta(null);
          }
          return;
        }

        const selectedBackendTypes = selectedTypes.map((type) => TYPE_TO_BACKEND[type] || type);
        const payload = await jobsApi.getPublicJobs({
          page,
          per_page: itemsPerPage,
          keyword: activeFilters.search,
          location: activeFilters.location,
          category: selectedCategories.join(',') || undefined,
          job_type: selectedBackendTypes.join(',') || undefined,
          experience_level: selectedExperienceLevels.join(',') || undefined,
        });
        const resultData = Array.isArray(payload.data) ? payload.data : payload.data?.data || [];
        const resultMeta = payload.data?.meta || null;
        const normalizedJobs = resultData.map(normalizePublicJob);
        const filtered = filterJobs(normalizedJobs, {
          search: activeFilters.search,
          location: activeFilters.location,
          selectedTypes,
          selectedExperienceLevels,
        }).filter((job) => !selectedCategories.length || selectedCategories.includes(job.category));

        if (!cancelled) {
          setJobs(filtered);
          setMeta(resultMeta);
        }
      } catch (err) {
        if (!cancelled) {
          setJobs([]);
          setMeta(null);
          setErrorStatus(500);
          setError(mode === 'recommended'
            ? t('publicJobs.errors.aiUnavailable')
            : normalizeApiError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchJobs();

    return () => {
      cancelled = true;
    };
  }, [activeFilters, mode, page, selectedCategories, selectedExperienceLevels, selectedTypes, user?.role, t]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (jobInputRef.current && !jobInputRef.current.contains(event.target)) {
        setShowJobSuggestions(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(event.target)) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { uniqueTitles, uniqueLocations, popularSearches } = useMemo(() => {
    const titleCounts = {};
    const locationSet = new Set();

    jobs.forEach((job) => {
      const title = job.title?.trim();
      if (title) titleCounts[title] = (titleCounts[title] || 0) + 1;
      if (job.location && job.location !== 'Remote') locationSet.add(job.location.trim());
    });

    const titles = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([title]) => title);

    return {
      uniqueTitles: titles,
      uniqueLocations: Array.from(locationSet).sort(),
      popularSearches: titles.slice(0, 4),
    };
  }, [jobs]);

  const filteredJobSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return uniqueTitles.filter((title) => title.toLowerCase().includes(query)).slice(0, 6);
  }, [searchQuery, uniqueTitles]);

  const filteredLocationSuggestions = useMemo(() => {
    if (!locationQuery) return [];
    const query = locationQuery.toLowerCase();
    return uniqueLocations.filter((jobLocation) => jobLocation.toLowerCase().includes(query)).slice(0, 6);
  }, [locationQuery, uniqueLocations]);

  const applySearch = (event) => {
    event.preventDefault();
    setActiveFilters((prev) => ({
      ...prev,
      search: searchQuery,
      location: locationQuery,
    }));
    setPage(1);
  };

  const applyPopularSearch = (term) => {
    setSearchQuery(term);
    setActiveFilters((prev) => ({ ...prev, search: term }));
    setShowJobSuggestions(false);
    setPage(1);
  };

  const toggleRecommended = () => {
    if (mode === 'recommended') {
      setRecommendationNotice('');
      setMode('all');
      setPage(1);
      return;
    }

    if (!isJobSeeker) {
      setRecommendationNotice(t('publicJobs.aiCard.notSeeker'));
      return;
    }

    setRecommendationNotice('');
    setMode('recommended');
    setPage(1);
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
    setPage(1);
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
    setPage(1);
  };

  const toggleExperienceLevel = (level) => {
    setSelectedExperienceLevels((prev) =>
      prev.includes(level) ? prev.filter((item) => item !== level) : [...prev, level]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setMode('all');
    setRecommendationNotice('');
    setSearchQuery('');
    setLocationQuery('');
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedExperienceLevels([]);
    setActiveFilters({ search: '', location: '' });
    setPage(1);
  };

  const handleForceDelete = async (event, job) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(t('publicJobs.admin.confirmDelete', { title: job.title }))) return;

    try {
      await adminApi.forceDeleteJob(job.id);
      setJobs((prev) => prev.filter((item) => item.id !== job.id));
      alert(t('publicJobs.admin.deleted'));
    } catch {
      alert(t('publicJobs.admin.deleteFailed'));
    }
  };

  const handleUnavailableSave = (job) => {
    navigate(ROUTES.LOGIN, { state: { from: { pathname: `/jobs/${job.id}` } } });
  };

  const hasActiveFilters =
    mode === 'recommended' ||
    searchQuery ||
    locationQuery ||
    selectedCategories.length > 0 ||
    selectedTypes.length > 0 ||
    selectedExperienceLevels.length > 0;

  const total = mode === 'recommended' ? jobs.length : meta?.total || jobs.length;
  const currentPage = mode === 'recommended' ? page : meta?.current_page || page;
  const lastPage = mode === 'recommended' ? Math.max(1, Math.ceil(jobs.length / itemsPerPage)) : meta?.last_page || 1;
  const visibleJobs = mode === 'recommended' ? jobs.slice((page - 1) * itemsPerPage, page * itemsPerPage) : jobs;
  const isAiScanning = mode === 'recommended' && loading;

  return (
    <div className="stitch-page flex min-h-screen flex-col bg-background text-on-background font-body-md">
      <PublicNavBar />
      <main className="relative isolate w-full flex-grow overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-140px] top-[-120px] h-[360px] w-[360px] rounded-full bg-secondary/10 blur-3xl"
          animate={reduce ? undefined : { y: [0, -16, 0], opacity: [0.65, 0.9, 0.65] }}
          transition={reduce ? undefined : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[18%] left-[-160px] h-[420px] w-[420px] rounded-full bg-tertiary/10 blur-3xl"
          animate={reduce ? undefined : { y: [0, 18, 0], opacity: [0.55, 0.85, 0.55] }}
          transition={reduce ? undefined : { duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-margin-desktop lg:py-margin-desktop">
          <Reveal as="section" className="relative overflow-hidden rounded-[2rem] border border-outline-variant/70 bg-surface-container-lowest/85 p-6 shadow-ambient backdrop-blur-xl sm:p-8 lg:p-10">
            <div aria-hidden="true" className="absolute inset-px rounded-[1.95rem] bg-gradient-to-br from-white/70 via-transparent to-secondary/10 dark:from-white/5 dark:to-secondary/15" />
            <div aria-hidden="true" className="absolute end-8 top-8 h-24 w-24 rounded-full bg-secondary/10 blur-2xl" />

            <div className="relative">
              <p className="mb-stack-sm font-label-sm text-label-sm uppercase tracking-wider text-secondary">{t('publicJobs.eyebrow')}</p>
              <h1 className="mb-stack-sm max-w-4xl break-words font-display text-[clamp(2.25rem,7vw,4rem)] font-bold leading-[1.05] tracking-tight text-primary">{t('publicJobs.title')}</h1>
              <p className="mb-gutter max-w-3xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
                {t('publicJobs.description')}
              </p>

              <motion.div
                className={`mb-gutter overflow-hidden rounded-[1.5rem] border p-stack-md transition-all duration-300 ease-out ${mode === 'recommended' ? 'border-secondary/40 bg-secondary/10 shadow-hover' : 'border-outline-variant/80 bg-surface-container-low/75 shadow-sm'}`}
                whileHover={reduce ? undefined : { y: -2, transition: { duration: 0.22, ease: EASE } }}
              >
                <button
                  className="group flex w-full flex-col gap-stack-md text-start outline-none sm:flex-row sm:items-center focus-visible:ring-2 focus-visible:ring-secondary/30"
                  onClick={toggleRecommended}
                  type="button"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 ${mode === 'recommended' ? 'bg-secondary text-on-secondary shadow-hover' : 'bg-primary text-on-primary group-hover:bg-secondary'} ${isAiScanning ? 'animate-pulse' : ''}`}>
                    <span className={`material-symbols-outlined text-[26px] ${isAiScanning ? 'animate-spin' : mode === 'recommended' ? 'animate-pulse' : ''}`}>auto_awesome</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-h2 text-h2 text-primary">{t('publicJobs.aiCard.title')}</span>
                    <span className="block break-words font-body-md text-body-md leading-relaxed text-on-surface-variant">
                      {isAiScanning ? t('publicJobs.aiCard.scanning') : t('publicJobs.aiCard.cta')}
                    </span>
                    {recommendationNotice && <span className="mt-2 block break-words text-sm text-secondary">{recommendationNotice}</span>}
                  </span>
                  <span className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 font-label-sm text-label-sm uppercase tracking-wider transition-all duration-300 ${mode === 'recommended' ? 'bg-secondary text-on-secondary shadow-sm' : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant group-hover:border-secondary/40 group-hover:text-secondary'}`}>
                    {mode === 'recommended' ? t('publicJobs.aiCard.aiOn') : t('publicJobs.aiCard.useAi')}
                  </span>
                </button>
              </motion.div>

              <form className="grid grid-cols-1 gap-stack-md rounded-[1.5rem] border border-outline-variant/70 bg-surface-container-low/65 p-3 shadow-sm backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={applySearch}>
                <label className="relative min-w-0" ref={jobInputRef}>
                  <span className="material-symbols-outlined pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                  <input
                    className={searchInputClass}
                    placeholder={t('publicJobs.searchJobPlaceholder')}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowJobSuggestions(true);
                    }}
                    onFocus={() => setShowJobSuggestions(true)}
                  />
                  {showJobSuggestions && filteredJobSuggestions.length > 0 && (
                    <ul className="absolute top-full start-0 end-0 z-50 mt-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-2 shadow-hover">
                      {filteredJobSuggestions.map((suggestion) => (
                        <li
                          key={suggestion}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-on-surface transition-colors hover:bg-surface-container-low"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setShowJobSuggestions(false);
                          }}
                        >
                          <span className="material-symbols-outlined shrink-0 text-[18px] text-outline-variant">search</span>
                          <span className="min-w-0 break-words">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </label>
                <label className="relative min-w-0" ref={locationInputRef}>
                  <span className="material-symbols-outlined pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant">location_on</span>
                  <input
                    className={searchInputClass}
                    placeholder={t('publicJobs.searchLocationPlaceholder')}
                    type="search"
                    value={locationQuery}
                    onChange={(event) => {
                      setLocationQuery(event.target.value);
                      setShowLocationSuggestions(true);
                    }}
                    onFocus={() => setShowLocationSuggestions(true)}
                  />
                  {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                    <ul className="absolute top-full start-0 end-0 z-50 mt-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-2 shadow-hover">
                      {filteredLocationSuggestions.map((suggestion) => (
                        <li
                          key={suggestion}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-on-surface transition-colors hover:bg-surface-container-low"
                          onClick={() => {
                            setLocationQuery(suggestion);
                            setShowLocationSuggestions(false);
                          }}
                        >
                          <span className="material-symbols-outlined shrink-0 text-[18px] text-outline-variant">location_on</span>
                          <span className="min-w-0 break-words">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </label>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={reduce || loading ? undefined : { y: -2, transition: { duration: 0.2, ease: EASE } }}
                  whileTap={reduce || loading ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-secondary px-gutter py-stack-sm font-h3 text-h3 text-on-secondary shadow-sm transition-all duration-300 ease-out hover:bg-secondary-container hover:shadow-hover disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
                >
                  {loading && mode === 'all' ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : t('publicJobs.searchButton')}
                </motion.button>
              </form>

              {popularSearches.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2 font-body-md text-on-surface-variant">
                  <span className="text-outline">{t('publicJobs.popular')}</span>
                  {popularSearches.map((term) => (
                    <motion.button
                      key={term}
                      className="rounded-full border border-outline-variant bg-surface-container-lowest/70 px-3 py-1 text-sm shadow-sm transition-all duration-200 ease-out hover:border-secondary hover:text-secondary hover:shadow-ambient focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
                      onClick={() => applyPopularSearch(term)}
                      type="button"
                      whileHover={reduce ? undefined : { y: -1, transition: { duration: 0.18, ease: EASE } }}
                      whileTap={reduce ? undefined : { scale: 0.97, transition: SPRING_PRESS }}
                    >
                      {term}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <section className="flex w-full flex-col gap-gutter md:flex-row">
            <div className="md:hidden">
              <motion.button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest/85 py-3 font-h3 text-primary shadow-ambient backdrop-blur-xl transition-all duration-300 hover:border-secondary/50 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
                onClick={() => setShowFilters(!showFilters)}
                type="button"
                whileTap={reduce ? undefined : { scale: 0.98, transition: SPRING_PRESS }}
              >
                <span className="material-symbols-outlined text-[20px]">{showFilters ? 'close' : 'tune'}</span>
                {showFilters ? t('publicJobs.hideFilters') : t('publicJobs.showFilters')}
              </motion.button>
            </div>

            <Reveal whenInView as="aside" className={`w-full shrink-0 md:w-[300px] ${showFilters ? 'block' : 'hidden md:block'}`}>
              <div className="overflow-hidden rounded-[1.5rem] border border-outline-variant/70 bg-surface-container-lowest/85 p-stack-md shadow-ambient backdrop-blur-xl md:sticky md:top-24">
                <div className="mb-stack-md flex items-center justify-between gap-3 border-b border-outline-variant/70 pb-stack-md">
                  <h3 className="flex items-center gap-2 font-h3 text-h3 text-primary">
                    <span className="material-symbols-outlined text-[20px] text-secondary">tune</span>
                    {t('publicJobs.filters.title')}
                  </h3>
                  {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />}
                </div>

                <div className="mb-stack-md">
                  <h4 className="mb-stack-sm font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">{t('publicJobs.filters.category')}</h4>
                  <div className="flex flex-col gap-1.5">
                    {CATEGORIES.map((category) => (
                      <label key={category} className={filterOptionClass}>
                        <input
                          type="checkbox"
                          className={filterCheckboxClass}
                          checked={selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                        />
                        <span className="min-w-0 break-words leading-relaxed">{t(`categories.${category}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-stack-md">
                  <h4 className="mb-stack-sm font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">{t('publicJobs.filters.jobType')}</h4>
                  <div className="flex flex-col gap-1.5">
                    {JOB_TYPES.map((type) => (
                      <label key={type} className={filterOptionClass}>
                        <input
                          type="checkbox"
                          className={filterCheckboxClass}
                          checked={selectedTypes.includes(type)}
                          onChange={() => toggleType(type)}
                        />
                        <span className="min-w-0 break-words leading-relaxed">{t(`jobTypesLabels.${type}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-stack-md">
                  <h4 className="mb-stack-sm font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">{t('publicJobs.filters.experience')}</h4>
                  <div className="flex flex-col gap-1.5">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <label key={level} className={filterOptionClass}>
                        <input
                          type="checkbox"
                          className={filterCheckboxClass}
                          checked={selectedExperienceLevels.includes(level)}
                          onChange={() => toggleExperienceLevel(level)}
                        />
                        <span className="min-w-0 break-words leading-relaxed">{t(`experienceLevels.${level}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <motion.button
                    className="mt-stack-md w-full rounded-xl border border-error/20 bg-error-container/10 py-2.5 text-center font-body-md font-semibold text-error transition-all duration-200 hover:border-error/40 hover:bg-error-container/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
                    onClick={clearFilters}
                    type="button"
                    whileTap={reduce ? undefined : { scale: 0.98, transition: SPRING_PRESS }}
                  >
                    {t('publicJobs.filters.clearAll')}
                  </motion.button>
                )}
              </div>
            </Reveal>

            <div className="min-w-0 flex-grow">
              <Reveal whenInView className="mb-5 rounded-[1.5rem] border border-outline-variant/70 bg-surface-container-lowest/75 p-4 shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="font-body-md text-on-surface-variant">
                      {t('publicJobs.results.showing')} <span className="font-semibold text-primary">{mode === 'recommended' ? jobs.length : total}</span> {t(`publicJobs.results.modes.${mode}`)}
                    </p>
                    {(selectedCategories.length > 0 || mode === 'recommended' || selectedExperienceLevels.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {mode === 'recommended' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 font-label-sm text-on-secondary-container shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            {t('publicJobs.results.recommendedTag')}
                          </span>
                        )}
                        {selectedCategories.map((category) => (
                          <span key={category} className="inline-flex min-w-0 items-center gap-1 rounded-full bg-secondary-container px-3 py-1 font-label-sm text-on-secondary-container shadow-sm">
                            <span className="min-w-0 break-words">{t('publicJobs.results.categoryTag', { name: t(`categories.${category}`, { defaultValue: category }) })}</span>
                            <button onClick={() => toggleCategory(category)} className="material-symbols-outlined text-[14px] transition-colors hover:text-error" type="button">close</button>
                          </span>
                        ))}
                        {selectedExperienceLevels.map((level) => (
                          <span key={level} className="inline-flex min-w-0 items-center gap-1 rounded-full bg-secondary-container px-3 py-1 font-label-sm text-on-secondary-container shadow-sm">
                            <span className="min-w-0 break-words">{t(`experienceLevels.${level}`)}</span>
                            <button onClick={() => toggleExperienceLevel(level)} className="material-symbols-outlined text-[14px] transition-colors hover:text-error" type="button">close</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>

              {errorStatus === 500 && error && (
                <div className="mb-4 rounded-xl border border-error/20 bg-error-container p-4 text-on-error-container shadow-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <JobListSkeleton loadingLabel={t('publicJobs.loadingJobs')} />
              ) : errorStatus === 403 ? (
                <SeekerEmptyState
                  icon="lock"
                  title={t('publicJobs.empty.lockedTitle')}
                  description={t('publicJobs.empty.lockedDescription')}
                  action={<a href="/seeker/cv-upload" className="inline-flex items-center justify-center gap-unit rounded-xl bg-secondary px-stack-md py-stack-sm font-h3 text-h3 text-on-secondary shadow-sm transition-all duration-300 hover:bg-secondary-container hover:shadow-hover">{t('publicJobs.empty.uploadCv')}</a>}
                />
              ) : visibleJobs.length === 0 ? (
                <SeekerEmptyState
                  icon="search_off"
                  title={mode === 'recommended' ? t('publicJobs.empty.noAiTitle') : t('publicJobs.empty.noJobsTitle')}
                  description={mode === 'recommended' ? t('publicJobs.empty.noAiDescription') : t('publicJobs.empty.noJobsDescription')}
                  action={<button onClick={clearFilters} className="inline-flex items-center justify-center gap-unit rounded-xl bg-secondary px-stack-md py-stack-sm font-h3 text-h3 text-on-secondary shadow-sm transition-all duration-300 hover:bg-secondary-container hover:shadow-hover" type="button">{t('publicJobs.empty.clearFilters')}</button>}
                />
              ) : (
                <>
                  <Stagger whenInView className="flex flex-col gap-4 md:gap-5" delayChildren={0.05} staggerChildren={0.05}>
                    {visibleJobs.map((job) => (
                      <Stagger.Item key={job.id} className="rounded-xl">
                        <div className="relative">
                          <SeekerJobCard
                            detailsPath={`/jobs/${job.id}`}
                            job={job}
                            onSaveUnavailable={handleUnavailableSave}
                            saveEnabled={isJobSeeker}
                            showSaveButton={!isAdmin && user?.role !== 'company'}
                          />
                          {isAdmin && (
                            <button
                              className="absolute end-5 top-5 z-10 inline-flex items-center gap-1 rounded-lg bg-error-container px-3 py-1.5 text-xs font-bold text-on-error-container shadow-sm transition-colors hover:bg-error hover:text-on-error"
                              onClick={(event) => handleForceDelete(event, job)}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                              {t('publicJobs.admin.forceDelete')}
                            </button>
                          )}
                        </div>
                      </Stagger.Item>
                    ))}
                  </Stagger>

                  {lastPage > 1 && (
                    <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-[1.5rem] border border-outline-variant/70 bg-surface-container-lowest/85 p-4 shadow-sm backdrop-blur-xl sm:flex-row">
                      <motion.button
                        className="w-full rounded-xl border border-outline-variant px-4 py-2 text-primary transition-all duration-200 hover:border-secondary/50 hover:bg-surface-container-low hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        disabled={currentPage <= 1 || loading}
                        onClick={() => setPage((prev) => prev - 1)}
                        type="button"
                        whileTap={reduce || currentPage <= 1 || loading ? undefined : { scale: 0.98, transition: SPRING_PRESS }}
                      >
                        {t('publicJobs.pagination.previous')}
                      </motion.button>
                      <span className="font-label-md text-on-surface-variant">
                        {t('publicJobs.pagination.page', { current: currentPage, total: lastPage })}
                      </span>
                      <motion.button
                        className="w-full rounded-xl border border-outline-variant px-4 py-2 text-primary transition-all duration-200 hover:border-secondary/50 hover:bg-surface-container-low hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        disabled={currentPage >= lastPage || loading}
                        onClick={() => setPage((prev) => prev + 1)}
                        type="button"
                        whileTap={reduce || currentPage >= lastPage || loading ? undefined : { scale: 0.98, transition: SPRING_PRESS }}
                      >
                        {t('publicJobs.pagination.next')}
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
