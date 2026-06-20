import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getJobs, getRecommendedJobs } from '../../services/jobSeekerDataService';
import SeekerJobCard from '../../components/jobSeeker/SeekerJobCard';
import SeekerEmptyState from '../../components/jobSeeker/SeekerEmptyState';
import Stagger from '../../motion/Stagger';
import { filterJobs } from '../../utils/jobFilters';

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Data Science', 'Finance', 'Customer Success', 'Operations', 'Human Resources', 'Other'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const EXPERIENCE_LEVELS = ['Internship', 'Entry Level / Junior', 'Mid Level', 'Senior', 'Lead / Manager', 'Director / Executive'];

const TYPE_TO_BACKEND = {
  'Full-time': 'full_time',
  'Part-time': 'part_time',
  Contract: 'contract',
  Internship: 'internship',
  Remote: 'remote',
};

function JobListSkeleton({ loadingLabel }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      {[1, 2, 3].map((skeleton) => (
        <div key={skeleton} className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant shadow-ambient animate-pulse flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-surface-container-high shrink-0" />
          <div className="flex-grow">
            <div className="h-6 bg-surface-container-high rounded w-1/3 mb-2" />
            <div className="h-4 bg-surface-container-high rounded w-1/4 mb-4" />
            <div className="flex gap-4 mb-4">
              <div className="h-4 bg-surface-container-high rounded w-16" />
              <div className="h-4 bg-surface-container-high rounded w-16" />
              <div className="h-4 bg-surface-container-high rounded w-16" />
            </div>
            <div className="h-5 bg-surface-container-high rounded w-2/3" />
          </div>
        </div>
      ))}
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}

export default function JobSeekerJobSearchPage({ initialMode = 'all' }) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedExperienceLevels, setSelectedExperienceLevels] = useState([]);
  const [activeFilters, setActiveFilters] = useState({ search: '', location: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const jobInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setErrorStatus(null);

      try {
        if (mode === 'recommended') {
          const recommendations = await getRecommendedJobs({ search: activeFilters.search });

          if (recommendations.needsCvUpload) {
            setJobs([]);
            setErrorStatus(403);
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

          setJobs(filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)));
          return;
        }

        const selectedBackendTypes = selectedTypes.map((type) => TYPE_TO_BACKEND[type] || type);
        const result = await getJobs({
          ...activeFilters,
          type: selectedBackendTypes.join(',') || undefined,
          category: selectedCategories.join(',') || undefined,
          experienceLevels: selectedExperienceLevels,
        });
        const filtered = filterJobs(result, {
          search: activeFilters.search,
          location: activeFilters.location,
          selectedTypes,
          selectedExperienceLevels,
        }).filter((job) => !selectedCategories.length || selectedCategories.includes(job.category));

        setJobs(filtered);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
        setErrorStatus(500);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [activeFilters, mode, selectedCategories, selectedExperienceLevels, selectedTypes]);

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
    return uniqueLocations.filter((location) => location.toLowerCase().includes(query)).slice(0, 6);
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
    setMode((prev) => prev === 'recommended' ? 'all' : 'recommended');
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
    setSearchQuery('');
    setLocationQuery('');
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedExperienceLevels([]);
    setActiveFilters({ search: '', location: '' });
    setPage(1);
  };

  const hasActiveFilters =
    mode === 'recommended' ||
    searchQuery ||
    locationQuery ||
    selectedCategories.length > 0 ||
    selectedTypes.length > 0 ||
    selectedExperienceLevels.length > 0;

  const currentPage = page;
  const lastPage = Math.max(1, Math.ceil(jobs.length / itemsPerPage));
  const visibleJobs = jobs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const isAiScanning = mode === 'recommended' && loading;

  return (
    <div className="px-4 sm:px-6 lg:px-margin-desktop py-6 lg:py-margin-desktop max-w-7xl mx-auto flex flex-col min-h-full space-y-gutter">
      <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-ambient border border-outline-variant">
        <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary mb-stack-sm">{t('publicJobs.eyebrow')}</p>
        <h1 className="font-display text-display text-primary mb-stack-sm">{t('publicJobs.title')}</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mb-gutter">
          {t('publicJobs.description')}
        </p>

        <div className={`mb-gutter rounded-2xl border p-stack-md transition-all ${mode === 'recommended' ? 'border-secondary/40 bg-secondary/10 shadow-ambient' : 'border-outline-variant bg-surface-container-low'}`}>
          <button
            className="group flex w-full flex-col gap-stack-md text-start sm:flex-row sm:items-center"
            onClick={toggleRecommended}
            type="button"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${mode === 'recommended' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'} ${isAiScanning ? 'animate-pulse' : ''}`}>
              <span className={`material-symbols-outlined text-[26px] ${isAiScanning ? 'animate-spin' : mode === 'recommended' ? 'animate-pulse' : ''}`}>auto_awesome</span>
            </span>
            <span className="flex-1">
              <span className="block font-h2 text-h2 text-primary">{t('publicJobs.aiCard.title')}</span>
              <span className="block font-body-md text-body-md text-on-surface-variant">
                {isAiScanning ? t('publicJobs.aiCard.scanning') : t('publicJobs.aiCard.cta')}
              </span>
            </span>
            <span className={`inline-flex items-center justify-center rounded-full px-4 py-2 font-label-sm text-label-sm uppercase tracking-wider ${mode === 'recommended' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant group-hover:text-secondary'}`}>
              {mode === 'recommended' ? t('publicJobs.aiCard.aiOn') : t('publicJobs.aiCard.useAi')}
            </span>
          </button>
        </div>

        <form className="mt-gutter grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-stack-md" onSubmit={applySearch}>
          <label className="relative" ref={jobInputRef}>
            <span className="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg ps-12 pe-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
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
              <ul className="absolute top-full start-0 end-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-hover overflow-hidden z-50 py-2">
                {filteredJobSuggestions.map((suggestion) => (
                  <li
                    key={suggestion}
                    className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-on-surface transition-colors flex items-center gap-3"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      setShowJobSuggestions(false);
                    }}
                  >
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">search</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </label>
          <label className="relative" ref={locationInputRef}>
            <span className="material-symbols-outlined absolute start-4 top-1/2 -translate-y-1/2 text-on-surface-variant">location_on</span>
            <input
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg ps-12 pe-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
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
              <ul className="absolute top-full start-0 end-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-hover overflow-hidden z-50 py-2">
                {filteredLocationSuggestions.map((suggestion) => (
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
          </label>
          <button type="submit" disabled={loading} className="bg-secondary text-on-secondary font-h3 text-h3 px-gutter py-stack-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-70 flex items-center justify-center gap-2">
            {loading && mode === 'all' ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : t('publicJobs.searchButton')}
          </button>
        </form>

        {popularSearches.length > 0 && (
          <div className="mt-5 flex items-center gap-2 flex-wrap text-on-surface-variant font-body-md">
            <span className="text-outline">{t('publicJobs.popular')}</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                className="px-3 py-1 rounded-full border border-outline-variant hover:border-secondary hover:text-secondary transition-colors text-sm"
                onClick={() => applyPopularSearch(term)}
                type="button"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="w-full flex flex-col md:flex-row gap-gutter">
        <div className="md:hidden">
          <button
            className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl font-h3 text-primary shadow-sm"
            onClick={() => setShowFilters(!showFilters)}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">{showFilters ? 'close' : 'tune'}</span>
            {showFilters ? t('publicJobs.hideFilters') : t('publicJobs.showFilters')}
          </button>
        </div>

        <aside className={`w-full md:w-[280px] shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="sticky top-6 bg-surface-container-lowest rounded-xl p-stack-md shadow-ambient border border-outline-variant">
            <h3 className="font-h3 text-h3 text-primary mb-stack-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">tune</span>
              {t('publicJobs.filters.title')}
            </h3>

            <div className="mb-stack-md">
              <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-stack-sm">{t('publicJobs.filters.category')}</h4>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer hover:text-secondary transition-colors">
                    <input
                      type="checkbox"
                      className="accent-[#2563EB] w-4 h-4 rounded"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {t(`categories.${category}`)}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-stack-md">
              <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-stack-sm">{t('publicJobs.filters.jobType')}</h4>
              <div className="flex flex-col gap-2">
                {JOB_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer hover:text-secondary transition-colors">
                    <input
                      type="checkbox"
                      className="accent-[#2563EB] w-4 h-4 rounded"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                    />
                    {t(`jobTypesLabels.${type}`)}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-stack-md">
              <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mb-stack-sm">{t('publicJobs.filters.experience')}</h4>
              <div className="flex flex-col gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <label key={level} className="flex items-center gap-2 font-body-md text-on-surface cursor-pointer hover:text-secondary transition-colors">
                    <input
                      type="checkbox"
                      className="accent-[#2563EB] w-4 h-4 rounded"
                      checked={selectedExperienceLevels.includes(level)}
                      onChange={() => toggleExperienceLevel(level)}
                    />
                    {t(`experienceLevels.${level}`)}
                  </label>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button className="mt-stack-md w-full py-2 text-center font-body-md text-error hover:bg-error-container/20 rounded-lg transition-colors" onClick={clearFilters} type="button">
                {t('publicJobs.filters.clearAll')}
              </button>
            )}
          </div>
        </aside>

        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-body-md text-on-surface-variant">
                {t('publicJobs.results.showing')} <span className="font-semibold text-primary">{jobs.length}</span> {t(`publicJobs.results.modes.${mode}`)}
              </p>
              {(selectedCategories.length > 0 || mode === 'recommended') && (
                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'recommended' && (
                    <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      {t('publicJobs.results.recommendedTag')}
                    </span>
                  )}
                  {selectedCategories.map((category) => (
                    <span key={category} className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm flex items-center gap-1">
                      {t('publicJobs.results.categoryTag', { name: t(`categories.${category}`, { defaultValue: category }) })}
                      <button onClick={() => toggleCategory(category)} className="material-symbols-outlined text-[14px] hover:text-error transition-colors" type="button">close</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {errorStatus === 500 && (
            <div className="p-4 bg-error-container text-on-error-container rounded-lg mb-4">
              {t('publicJobs.errors.loadFailed')}
            </div>
          )}

          {loading ? (
            <JobListSkeleton loadingLabel={t('publicJobs.loadingJobs')} />
          ) : errorStatus === 403 ? (
            <SeekerEmptyState
              icon="lock"
              title={t('publicJobs.empty.lockedTitle')}
              description={t('publicJobs.empty.lockedDescription')}
              action={<a href="/seeker/cv-upload" className="inline-flex items-center justify-center gap-unit bg-secondary text-on-secondary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 shadow-sm hover:opacity-90 transition-opacity">{t('publicJobs.empty.uploadCv')}</a>}
            />
          ) : jobs.length === 0 ? (
            <SeekerEmptyState
              icon="search_off"
              title={mode === 'recommended' ? t('publicJobs.empty.noAiTitle') : t('publicJobs.empty.noJobsTitle')}
              description={mode === 'recommended' ? t('publicJobs.empty.noAiDescription') : t('publicJobs.empty.noJobsDescription')}
              action={<button onClick={clearFilters} className="inline-flex items-center justify-center gap-unit bg-secondary text-on-secondary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 shadow-sm hover:opacity-90 transition-opacity" type="button">{t('publicJobs.empty.clearFilters')}</button>}
            />
          ) : (
            <>
              <Stagger className="flex flex-col gap-4" delayChildren={0.05} staggerChildren={0.05}>
                {visibleJobs.map((job) => (
                  <Stagger.Item key={job.id}>
                    <SeekerJobCard job={job} />
                  </Stagger.Item>
                ))}
              </Stagger>

              {lastPage > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant mt-4">
                  <button
                    className="w-full sm:w-auto px-4 py-2 border border-outline-variant rounded-lg text-primary disabled:opacity-50 hover:bg-surface-container-low transition-colors"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setPage((prev) => prev - 1)}
                    type="button"
                  >
                    {t('publicJobs.pagination.previous')}
                  </button>
                  <span className="text-on-surface-variant font-label-md">
                    {t('publicJobs.pagination.page', { current: currentPage, total: lastPage })}
                  </span>
                  <button
                    className="w-full sm:w-auto px-4 py-2 border border-outline-variant rounded-lg text-primary disabled:opacity-50 hover:bg-surface-container-low transition-colors"
                    disabled={currentPage >= lastPage || loading}
                    onClick={() => setPage((prev) => prev + 1)}
                    type="button"
                  >
                    {t('publicJobs.pagination.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
