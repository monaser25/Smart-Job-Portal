import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminActivityItem from '../../components/admin/AdminActivityItem';
import AdminConfirmModal from '../../components/admin/AdminConfirmModal';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminJobTable from '../../components/admin/AdminJobTable';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminRoleBadge from '../../components/admin/AdminRoleBadge';
import AdminStatsCard from '../../components/admin/AdminStatsCard';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import AdminUserTable from '../../components/admin/AdminUserTable';
import CompanySkillTag from '../../components/company/CompanySkillTag';
import { useToast } from '../../components/useToast';
import { adminDataService } from '../../services/adminDataService';
import { adminApi } from '../../api/adminApi';
import { getContactInfo } from '../../services/publicDataService';
import { useAuth } from '../../context/useAuth';
import { ROUTES } from '../../utils/constants';
import Stagger from '../../motion/Stagger';
import Reveal from '../../motion/Reveal';

const buttonPrimary = 'inline-flex items-center justify-center gap-unit bg-secondary text-on-secondary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';
const buttonSecondary = 'inline-flex items-center justify-center gap-unit border border-outline-variant text-primary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const buttonDanger = 'inline-flex items-center justify-center gap-unit border border-error/30 text-error px-stack-md py-stack-sm rounded-lg font-h3 text-h3 hover:bg-error-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const buttonSuccess = 'inline-flex items-center justify-center gap-unit bg-tertiary text-on-tertiary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';

export function FullPageSpinner() {
  return (
    <div className="flex w-full min-h-[400px] items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
    </div>
  );
}

function TextInput(props) {
  return <input className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary disabled:opacity-50" {...props} />;
}

function SelectInput(props) {
  return (
    <div className="relative">
      <select 
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary disabled:opacity-50 appearance-none cursor-pointer" 
        {...props} 
      />
      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
        expand_more
      </span>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="font-label-md text-label-md text-primary">{label}</span>
      <div className="mt-unit">{children}</div>
      {error && <p className="font-body-sm text-body-sm text-error mt-unit">{error}</p>}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient p-4 sm:p-6 lg:p-8 space-y-6">
      <h2 className="font-h2 text-h2 text-primary">{title}</h2>
      {children}
    </section>
  );
}

function PaginationControls({ page, setPage, itemsCount }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-stack-md bg-surface-container-lowest p-stack-sm rounded-lg border border-outline-variant">
      <button className={buttonSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('adminFlow.pagination.previous')}</button>
      <span className="text-on-surface-variant font-label-md">{t('adminFlow.pagination.page', { page })}</span>
      <button className={buttonSecondary} disabled={itemsCount < 15} onClick={() => setPage(p => p + 1)}>{t('adminFlow.pagination.next')}</button>
    </div>
  );
}

function UserStatusModal({ target, onCancel, onComplete }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const isBanned = target?.accountStatus === 'banned' || target?.is_banned;

  return (
    <AdminConfirmModal
      confirmLabel={saving ? t('adminFlow.saving') : (isBanned ? t('buttons.unban') : t('buttons.ban'))}
      message={target ? t(isBanned ? 'adminFlow.users.unbanConfirmMessage' : 'adminFlow.users.banConfirmMessage', { name: target.name }) : ''}
      onCancel={onCancel}
      onConfirm={async () => {
        setSaving(true);
        try {
          await adminApi.toggleBan(target.id);
          addToast({ title: isBanned ? t('adminFlow.users.unbannedTitle') : t('adminFlow.users.bannedTitle'), message: t('adminFlow.users.statusUpdatedMessage', { name: target.name }), type: 'success' });
          onComplete?.();
        } catch (e) {
          addToast({ title: t('statuses.error'), message: t('adminFlow.users.statusUpdateError'), type: 'error' });
        } finally {
          setSaving(false);
        }
      }}
      open={Boolean(target)}
      title={isBanned ? t('adminFlow.users.unbanTitle') : t('adminFlow.users.banTitle')}
      variant={isBanned ? 'primary' : 'danger'}
    />
  );
}

function JobDeleteModal({ target, onCancel, onComplete }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  return (
    <AdminConfirmModal
      confirmLabel={saving ? t('adminFlow.deleting') : t('buttons.forceDelete')}
      message={target ? t('adminFlow.jobs.forceDeleteConfirmMessage', { title: target.title }) : ''}
      onCancel={onCancel}
      onConfirm={async () => {
        setSaving(true);
        try {
          await adminApi.forceDeleteJob(target.id);
          addToast({ title: t('adminFlow.jobs.forceDeletedTitle'), message: t('adminFlow.jobs.forceDeletedMessage', { title: target.title }), type: 'success' });
          onComplete?.();
        } catch (e) {
          addToast({ title: t('statuses.error'), message: t('adminFlow.jobs.forceDeleteError'), type: 'error' });
        } finally {
          setSaving(false);
        }
      }}
      open={Boolean(target)}
      title={t('adminFlow.jobs.forceDeleteTitle')}
      variant="danger"
    />
  );
}

function NotFoundState({ title, message }) {
  const { t } = useTranslation();
  return <AdminEmptyState title={title || t('adminFlow.notFoundTitle')} message={message || t('adminFlow.notFoundMessage')} />;
}

function CVParsedDataDisplay({ data }) {
  const { t, i18n } = useTranslation();
  if (!data || typeof data !== 'object') return <p>{t('adminFlow.profile.noValidData')}</p>;
  
  const renderValue = (val) => {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      return <span className="text-primary">{new Date(val).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</span>;
    }

    if (Array.isArray(val)) {
      if (val.every(item => typeof item !== 'object' && item !== null)) {
        return (
          <div className="flex flex-wrap gap-2 mt-2">
            {val.map((item, i) => (
              <span key={i} className="px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full font-label-sm border border-outline-variant">
                {String(item)}
              </span>
            ))}
          </div>
        );
      }
      return (
        <ul className="list-disc pl-5 mt-1 space-y-1">
          {val.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? renderValue(item) : item}</li>
          ))}
        </ul>
      );
    }
    if (typeof val === 'object' && val !== null) {
      return (
        <div className="pl-4 mt-2 border-l-2 border-outline-variant space-y-2">
          {Object.entries(val).map(([k, v]) => {
            if (!v || (Array.isArray(v) && v.length === 0)) return null;
            return (
              <div key={k}>
                <span className="font-semibold capitalize text-on-surface-variant text-sm block">{k.replace(/_/g, ' ')}:</span>
                <div className="text-primary mt-0.5">{renderValue(v)}</div>
              </div>
            );
          })}
        </div>
      );
    }
    return <span className="text-primary">{String(val)}</span>;
  };

  return (
    <div className="grid gap-4">
      {Object.entries(data).map(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) return null;
        return (
          <div key={key} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm">
            <h4 className="font-h3 text-primary capitalize mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                {key === 'skills' ? 'psychology' : key === 'experience' ? 'work' : key === 'education' ? 'school' : 'info'}
              </span>
              {key.replace(/_/g, ' ')}
            </h4>
            <div className="font-body-md leading-relaxed">{renderValue(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminDataService.getAdminDashboardData()
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (!data) return <NotFoundState title={t('adminFlow.dashboard.errorTitle')} message={t('adminFlow.dashboard.errorMessage')} />;

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminFlow.dashboard.eyebrow')}
        title={t('adminFlow.dashboard.title')}
        description={t('adminFlow.dashboard.description')}
      />
      <Stagger as="div" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8" delayChildren={0.05} staggerChildren={0.07}>
        <Stagger.Item>
          <AdminStatsCard icon="group" label={t('adminFlow.dashboard.totalUsers')} to={ROUTES.ADMIN_USERS} value={data.metrics?.totalUsers ?? 0} />
        </Stagger.Item>
        <Stagger.Item>
          <AdminStatsCard icon="person_search" label={t('adminFlow.dashboard.jobSeekers')} to={ROUTES.ADMIN_USERS} value={data.metrics?.jobSeekers ?? 0} />
        </Stagger.Item>
        <Stagger.Item>
          <AdminStatsCard icon="domain" label={t('adminFlow.dashboard.companies')} to={ROUTES.ADMIN_USERS} value={data.metrics?.companies ?? 0} />
        </Stagger.Item>
        <Stagger.Item>
          <AdminStatsCard icon="work" label={t('adminFlow.dashboard.activeJobs')} to={ROUTES.ADMIN_JOBS} value={data.metrics?.activeJobs ?? 0} />
        </Stagger.Item>
        <Stagger.Item>
          <AdminStatsCard icon="assignment" label={t('adminFlow.dashboard.totalApplications')} to={ROUTES.ADMIN_JOBS} value={data.metrics?.totalApplications ?? 0} />
        </Stagger.Item>
        <Stagger.Item>
          <AdminStatsCard icon="block" label={t('adminFlow.dashboard.bannedUsers')} to={ROUTES.ADMIN_USERS} value={data.metrics?.bannedUsers ?? 0} />
        </Stagger.Item>
      </Stagger>

      <Reveal as="section" className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8" whenInView>
        <Section title={t('adminFlow.dashboard.recentUsers')}>
          {data.recentUsers?.map((user) => (
            <Link className="flex items-center justify-between border-b border-outline-variant py-stack-md last:border-b-0 hover:bg-surface-container-low rounded-lg px-stack-sm transition-colors" key={user.id} to={`/admin/users/${user.id}`}>
              <div>
                <p className="font-h3 text-h3 text-primary">{user.name}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
              </div>
              <AdminRoleBadge role={user.role} />
            </Link>
          ))}
          {!data.recentUsers?.length && <p className="text-on-surface-variant p-4">{t('adminFlow.dashboard.noRecentUsers')}</p>}
        </Section>
        <Section title={t('adminFlow.dashboard.recentJobs')}>
          {data.recentJobs?.map((job) => (
            <Link className="flex items-center justify-between border-b border-outline-variant py-stack-md last:border-b-0 hover:bg-surface-container-low rounded-lg px-stack-sm transition-colors" key={job.id} to={`/admin/jobs/${job.id}`}>
              <div>
                <p className="font-h3 text-h3 text-primary">{job.title}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{job.company} · {job.location}</p>
              </div>
              <AdminStatusBadge status={job.status} />
            </Link>
          ))}
          {!data.recentJobs?.length && <p className="text-on-surface-variant p-4">{t('adminFlow.dashboard.noRecentJobs')}</p>}
        </Section>
      </Reveal>

      <Reveal as="section" className="grid grid-cols-1 gap-8 mb-8" whenInView>
        <Section title={t('adminFlow.dashboard.recentActivity')}>
          {data.recentActivity?.map((item) => <AdminActivityItem item={item} key={item.id} />)}
          {!data.recentActivity?.length && <p className="text-on-surface-variant p-4">{t('adminFlow.dashboard.noRecentActivity')}</p>}
        </Section>
      </Reveal>
    </>
  );
}

export function AdminUsersManagement() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ query: '', filter: 'all', sort: 'newest', verification: 'all' });
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await adminDataService.getAdminUsers({ ...filters, page }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminFlow.users.eyebrow')}
        title={t('adminFlow.users.title')}
        description={t('adminFlow.users.description')}
      />
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient p-6 grid grid-cols-1 md:grid-cols-[1fr_160px_160px_160px] gap-6 mb-8">
        <TextInput onChange={(e) => updateFilter('query', e.target.value)} placeholder={t('adminFlow.users.searchPlaceholder')} value={filters.query} />
        <SelectInput onChange={(e) => updateFilter('filter', e.target.value)} value={filters.filter}>
          {['all', 'job_seekers', 'companies', 'admins', 'active', 'banned'].map(val => (
            <option key={val} value={val}>{t(`adminFlow.users.filterOptions.${val}`)}</option>
          ))}
        </SelectInput>
        <SelectInput onChange={(e) => updateFilter('verification', e.target.value)} value={filters.verification}>
          {['all', 'verified', 'unverified'].map(val => (
            <option key={val} value={val}>{t(`adminFlow.users.verificationOptions.${val}`)}</option>
          ))}
        </SelectInput>
        <SelectInput onChange={(e) => updateFilter('sort', e.target.value)} value={filters.sort}>
          {['newest', 'oldest', 'name'].map(val => (
            <option key={val} value={val}>{t(`adminFlow.users.sortOptions.${val}`)}</option>
          ))}
        </SelectInput>
      </div>

      {loading ? <FullPageSpinner /> : (
        <>
          <AdminUserTable users={users} onStatusAction={setTarget} />
          <PaginationControls page={page} setPage={setPage} itemsCount={users.length} />
        </>
      )}

      <UserStatusModal
        onCancel={() => setTarget(null)}
        onComplete={() => { setTarget(null); refresh(); }}
        target={target}
      />
    </>
  );
}

export function AdminUserDetails() {
  const { t } = useTranslation();
  const { userId, id } = useParams();
  const { addToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const fetchUser = useCallback(() => {
    setLoading(true);
    adminApi.getUserById(userId || id)
      .then(res => setUser(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId, id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await adminApi.verifyUser(user.id);
      addToast({ title: t('adminFlow.userDetails.verifiedTitle'), message: t('adminFlow.userDetails.verifiedMessage', { name: user.name }), type: 'success' });
      setUser(prev => ({ ...prev, email_verified_at: new Date().toISOString() }));
    } catch (e) {
      addToast({ title: t('statuses.error'), message: e?.response?.data?.message || t('adminFlow.userDetails.verifyError'), type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!user) return <NotFoundState title={t('adminFlow.userDetails.notFoundTitle')} message={t('adminFlow.userDetails.notFoundMessage')} />;

  const isBanned = Boolean(user.is_banned);
  const isVerified = Boolean(user.email_verified_at);

  return (
    <>
      <AdminPageHeader
        actions={
          <>
            <Link className={buttonSecondary} to={ROUTES.ADMIN_USERS}>{t('adminFlow.userDetails.backToUsers')}</Link>
            {user.role === 'company' && (
              <Link className={buttonSecondary} to={`/companies/${user.id}`} target="_blank">
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                {t('adminFlow.userDetails.viewPublicProfile')}
              </Link>
            )}
            {!isVerified && (
              <button
                className={buttonSuccess}
                disabled={verifying}
                onClick={handleVerify}
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                {verifying ? t('adminFlow.userDetails.verifying') : t('adminFlow.userDetails.verifyEmail')}
              </button>
            )}
            <button
              className={isBanned ? buttonPrimary : buttonDanger}
              onClick={() => setTarget(user)}
            >
              {isBanned ? t('buttons.unban') : t('buttons.ban')}
            </button>
          </>
        }
        eyebrow={t('adminFlow.userDetails.eyebrow')}
        title={user.name}
        description={user.email}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <Section title={t('adminFlow.userDetails.accountDetails')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              [t('dashboardComponents.common.role'), <AdminRoleBadge role={user.role} key="role" />],
              [t('adminFlow.userDetails.emailVerified'), (
                <span key="verified" className={`inline-flex items-center gap-1 font-label-sm px-2 py-1 rounded-full ${isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  <span className="material-symbols-outlined text-[14px]">{isVerified ? 'check_circle' : 'pending'}</span>
                  {isVerified ? t('adminFlow.userDetails.verifiedBadge') : t('adminFlow.userDetails.notVerifiedBadge')}
                </span>
              )],
              [t('adminFlow.userDetails.accountStatus'), <AdminStatusBadge status={isBanned ? 'banned' : 'active'} key="banned" />],
              [t('dashboardComponents.common.created'), new Date(user.created_at).toLocaleDateString()],
              [t('adminFlow.userDetails.emailField'), user.email],
            ].map(([label, value]) => (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-center" key={label}>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">{label}</p>
                <div className="font-h3 text-h3 text-primary break-all">{value}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t('adminFlow.userDetails.profileSummary')}>
          <div className="flex flex-col gap-6">
            {user.role === 'job_seeker' && user.profile && (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm">
                <p className="font-h3 text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">psychology</span>
                  {t('adminFlow.userDetails.jobSeekerSkills')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.profile.job_seeker_skills?.map((s) => (
                    <CompanySkillTag key={s.id}>{s.skill?.name}</CompanySkillTag>
                  ))}
                  {!user.profile.job_seeker_skills?.length && (
                    <p className="text-sm text-on-surface-variant italic">{t('adminFlow.userDetails.noSkills')}</p>
                  )}
                </div>
                {user.profile.cv_parsed_data && (
                  <div className="mt-6 pt-4 border-t border-outline-variant flex items-center justify-between">
                    <p className="font-h3 text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-success text-[20px]">check_circle</span>
                      {t('adminFlow.userDetails.cvDataAvailable')}
                    </p>
                    <Link to={`/admin/users/${user.id}/profile`} className="text-secondary font-semibold hover:underline flex items-center gap-1 bg-secondary-container/20 px-4 py-2 rounded-lg transition-colors">
                      {t('adminFlow.userDetails.viewProfile')}
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
            {user.role === 'company' && user.profile && (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col gap-4">
                <p className="font-h3 text-primary flex items-center gap-2 border-b border-outline-variant pb-4 mb-2">
                  <span className="material-symbols-outlined text-secondary">domain</span>
                  {t('adminFlow.userDetails.companyInfo')}
                </p>
                <div className="flex flex-col gap-3">
                  <p className="text-on-surface-variant flex items-center justify-between">
                    <span>{t('adminFlow.userDetails.postedJobs')}:</span>
                    <Link to={`/admin/jobs?query=${encodeURIComponent(user.name)}`} className="font-bold text-secondary flex items-center gap-1 hover:underline bg-surface-container-highest/10 px-3 py-1.5 rounded-lg border border-outline-variant/50 transition-colors">
                      {user.profile.job_posts_count || 0}
                      <span className="material-symbols-outlined text-[16px]">link</span>
                    </Link>
                  </p>
                  <p className="text-on-surface-variant flex items-center justify-between">
                    <span>{t('adminFlow.userDetails.industry')}:</span>
                    <span className="font-bold text-primary">{user.profile.industry || t('adminFlow.userDetails.notAvailable')}</span>
                  </p>
                  <p className="text-on-surface-variant flex items-center justify-between">
                    <span>{t('adminFlow.userDetails.location')}:</span>
                    <span className="font-bold text-primary text-right break-words max-w-[200px]">{user.profile.location || t('adminFlow.userDetails.notAvailable')}</span>
                  </p>
                  <p className="text-on-surface-variant flex items-center justify-between">
                    <span>{t('adminFlow.userDetails.employees')}:</span>
                    <span className="font-bold text-primary">{user.profile.employees || t('adminFlow.userDetails.notAvailable')}</span>
                  </p>
                  <p className="text-on-surface-variant flex flex-col gap-1 mt-2">
                    <span>{t('adminFlow.userDetails.website')}:</span>
                    <a href={user.profile.website} target="_blank" rel="noreferrer" className="text-secondary hover:underline font-medium break-all">
                      {user.profile.website || t('adminFlow.userDetails.notAvailable')}
                    </a>
                  </p>
                  <div className="mt-2 pt-4 border-t border-outline-variant">
                    <span className="text-on-surface-variant mb-1 block">{t('adminFlow.userDetails.description')}:</span>
                    <p className="text-primary font-body-sm leading-relaxed max-h-40 overflow-auto">
                      {user.profile.description || t('adminFlow.userDetails.noDescription')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {user.role === 'admin' && (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm">
                <p className="text-on-surface-variant flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[32px]">admin_panel_settings</span>
                  <span>{t('adminFlow.userDetails.adminPermissions')}</span>
                </p>
              </div>
            )}
          </div>
        </Section>
      </div>

      <UserStatusModal
        onCancel={() => setTarget(null)}
        onComplete={() => { setTarget(null); fetchUser(); }}
        target={target}
      />
    </>
  );
}

export function AdminUserProfile() {
  const { t } = useTranslation();
  const { userId, id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(() => {
    setLoading(true);
    adminApi.getUserById(userId || id)
      .then(res => setUser(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId, id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  if (loading) return <FullPageSpinner />;
  if (!user || user.role !== 'job_seeker') return <NotFoundState title={t('adminFlow.userProfile.notFoundTitle')} message={t('adminFlow.userProfile.notFoundMessage')} />;

  return (
    <>
      <AdminPageHeader
        actions={
          <Link className={buttonSecondary} to={`/admin/users/${user.id}`}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {t('adminFlow.userProfile.backToDetails')}
          </Link>
        }
        eyebrow={t('adminFlow.userProfile.eyebrow')}
        title={t('adminFlow.userProfile.title')}
      />

      <div className="flex flex-col gap-8">
        {/* Profile Header (LinkedIn Style) */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="h-32 bg-secondary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <span className="material-symbols-outlined text-[150px] text-secondary">person</span>
            </div>
          </div>
          <div className="px-8 pb-8 relative">
            <div className="w-24 h-24 rounded-full bg-surface border-4 border-surface-container-lowest flex items-center justify-center font-display text-h1 text-primary shadow-sm -mt-12 mb-4">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-h2 text-primary">{user.name}</h1>
                <p className="font-body-lg text-on-surface-variant mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">email</span>
                  {user.email}
                </p>
                {user.profile?.location && (
                  <p className="font-body-md text-on-surface-variant mt-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    {user.profile.location}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <span className={`inline-flex items-center gap-1 font-label-sm px-3 py-1.5 rounded-full ${user.email_verified_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  <span className="material-symbols-outlined text-[16px]">{user.email_verified_at ? 'check_circle' : 'pending'}</span>
                  {user.email_verified_at ? t('adminFlow.userProfile.verifiedAccount') : t('adminFlow.userProfile.unverifiedAccount')}
                </span>
                <span className={`inline-flex items-center gap-1 font-label-sm px-3 py-1.5 rounded-full ${!user.is_banned ? 'bg-surface-container text-primary' : 'bg-error-container text-error'}`}>
                  <span className="material-symbols-outlined text-[16px]">{!user.is_banned ? 'verified_user' : 'block'}</span>
                  {!user.is_banned ? t('adminFlow.userProfile.activeStatus') : t('adminFlow.userProfile.bannedStatus')}
                </span>
              </div>
            </div>

            {user.profile?.job_seeker_skills?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-outline-variant">
                <h3 className="font-h3 text-primary mb-3">{t('adminFlow.userProfile.topSkills')}</h3>
                <div className="flex flex-wrap gap-2">
                  {user.profile.job_seeker_skills.map((s) => (
                    <CompanySkillTag key={s.id}>{s.skill?.name}</CompanySkillTag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extracted CV Data */}
        <Section title={t('adminFlow.userProfile.cvExtractedInfo')}>
          {user.profile?.cv_parsed_data ? (
            <CVParsedDataDisplay data={user.profile.cv_parsed_data} />
          ) : (
            <AdminEmptyState title={t('adminFlow.userProfile.noCvDataTitle')} message={t('adminFlow.userProfile.noCvDataMessage')} />
          )}
        </Section>
      </div>
    </>
  );
}

export function AdminJobsManagement() {
  const { t } = useTranslation();
  const location = useLocation();
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { query: params.get('query') || '', filter: 'all', sort: 'newest' };
  });
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await adminDataService.getAdminJobs({ ...filters, page }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminFlow.jobs.eyebrow')}
        title={t('adminFlow.jobs.title')}
        description={t('adminFlow.jobs.description')}
      />
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient p-6 grid grid-cols-1 md:grid-cols-[1fr_180px_190px] gap-6 mb-8">
        <TextInput onChange={(e) => updateFilter('query', e.target.value)} placeholder={t('adminFlow.jobs.searchPlaceholder')} value={filters.query} />
        <SelectInput onChange={(e) => updateFilter('filter', e.target.value)} value={filters.filter}>
          {['all', 'active', 'paused', 'deleted'].map(val => (
            <option key={val} value={val}>{t(`adminFlow.jobs.filterOptions.${val}`)}</option>
          ))}
        </SelectInput>
        <SelectInput onChange={(e) => updateFilter('sort', e.target.value)} value={filters.sort}>
          {['newest', 'applicants', 'reports'].map(val => (
            <option key={val} value={val}>{t(`adminFlow.jobs.sortOptions.${val}`)}</option>
          ))}
        </SelectInput>
      </div>

      {loading ? <FullPageSpinner /> : (
        <>
          <AdminJobTable jobs={jobs} onDeleteRequest={setTarget} />
          <PaginationControls page={page} setPage={setPage} itemsCount={jobs.length} />
        </>
      )}

      <JobDeleteModal
        onCancel={() => setTarget(null)}
        onComplete={() => { setTarget(null); refresh(); }}
        target={target}
      />
    </>
  );
}

export function AdminJobDetails() {
  const { t } = useTranslation();
  const { jobId, id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      setJob(await adminDataService.getAdminJobById(jobId || id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [jobId, id]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  if (loading) return <FullPageSpinner />;
  if (!job) return <NotFoundState title={t('adminFlow.jobDetails.notFoundTitle')} message={t('adminFlow.jobDetails.notFoundMessage')} />;

  return (
    <>
      <AdminPageHeader
        actions={
          <>
            <Link className={buttonSecondary} to={ROUTES.ADMIN_JOBS}>{t('adminFlow.jobDetails.backToJobs')}</Link>
            <button className={buttonDanger} onClick={() => setTarget(job)}>{t('buttons.forceDelete')}</button>
          </>
        }
        eyebrow={t('adminFlow.jobDetails.eyebrow')}
        title={job.title}
        description={`${job.company} · ${job.location}`}
      />
      
      <div className="flex flex-col gap-8">
        <div className="bg-error-container border border-error/20 text-error rounded-xl p-6 shadow-sm flex items-start gap-4">
          <span className="material-symbols-outlined text-[32px] shrink-0 mt-1">warning</span>
          <div>
            <p className="font-h3 text-h3">{t('adminFlow.jobDetails.forceDeleteWarningTitle')}</p>
            <p className="font-body-md text-body-md mt-1">{t('adminFlow.jobDetails.forceDeleteWarningMsg')}</p>
          </div>
        </div>

        <Section title={t('adminFlow.jobDetails.jobInfo')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              [t('dashboardComponents.common.status'), <AdminStatusBadge status={job.status} key="status" />],
              [t('companyFlow.form.category'), job.category],
              [t('companyFlow.form.jobType'), t(`jobTypesLabels.${job.type?.replace('_', ' ')?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')}`, { defaultValue: job.type?.replace('_', ' ') })],
              [t('dashboardComponents.common.salary'), job.salary],
              [t('dashboardComponents.common.posted', { date: '' }).trim(), job.postedAt],
              [t('dashboardComponents.common.applicants'), job.applicantsCount],
              [t('dashboardComponents.common.reports'), job.reportsCount || 0],
              [t('adminFlow.jobDetails.companyId'), job.companyId],
            ].map(([label, value]) => (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-center" key={label}>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">{label}</p>
                <div className="font-h3 text-h3 text-primary break-all capitalize">{value}</div>
              </div>
            ))}
          </div>
          
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm mt-6">
            <h3 className="font-h3 text-h3 text-primary mb-4">{t('adminFlow.jobDetails.jobDescription')}</h3>
            <p className="font-body-lg text-body-lg text-on-surface-variant whitespace-pre-wrap leading-relaxed">{job.description || t('adminFlow.jobDetails.noDescription')}</p>
          </div>
          
          {job.responsibilities?.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm mt-6">
              <h3 className="font-h3 text-h3 text-primary mb-4">{t('adminFlow.jobDetails.responsibilities')}</h3>
              <ul className="list-disc pl-5 text-on-surface-variant flex flex-col gap-2 font-body-lg">
                {job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {job.requirements?.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm mt-6">
              <h3 className="font-h3 text-h3 text-primary mb-4">{t('adminFlow.jobDetails.requirements')}</h3>
              <ul className="list-disc pl-5 text-on-surface-variant flex flex-col gap-2 font-body-lg">
                {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {job.requiredSkills?.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm mt-6">
              <h3 className="font-h3 text-h3 text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">psychology</span>
                {t('adminFlow.jobDetails.requiredSkills')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => <CompanySkillTag key={skill}>{skill}</CompanySkillTag>)}
              </div>
            </div>
          )}
        </Section>
      </div>
      <JobDeleteModal
        onCancel={() => setTarget(null)}
        onComplete={() => { setTarget(null); navigate(ROUTES.ADMIN_JOBS); }}
        target={target}
      />
    </>
  );
}

export function AdminActivityLog() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminDataService.getActivityLog()
      .then((activity) => {
        if (!cancelled) setItems(activity);
      })
      .catch((error) => {
        if (!cancelled) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredItems = filter === 'all'
    ? items
    : filter === 'admin'
      ? items.filter((item) => item.performedBy === 'Admin' || item.performedBy === 'System')
      : filter === 'company'
        ? items.filter((item) => item.targetType === 'Job' && item.performedBy !== 'Admin')
        : items.filter((item) => item.targetType.toLowerCase() === filter);

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminFlow.activityLog.eyebrow')}
        title={t('adminFlow.activityLog.title')}
        description={t('adminFlow.activityLog.description')}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <Section title={t('adminFlow.activityLog.activityStream')}>
          <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'user', 'job', 'company', 'admin'].map((item) => (
              <button
                className={`${filter === item ? 'bg-secondary text-on-secondary ring-2 ring-secondary/30' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'} rounded-full px-5 py-2 font-label-md text-label-md capitalize transition-all`}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === 'all' ? t('adminFlow.activityLog.filterAll') : item === 'admin' ? t('adminFlow.activityLog.filterAdmin') : t('adminFlow.activityLog.filterEvents', { item: t(`dashboardComponents.common.${item}`, { defaultValue: item }) })}
              </button>
            ))}
          </div>
          {loading ? (
            <FullPageSpinner />
          ) : filteredItems.length ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-outline-variant">
                {filteredItems.map((item) => <AdminActivityItem item={item} key={item.id} />)}
              </div>
            </div>
          ) : (
            <AdminEmptyState title={t('adminFlow.activityLog.noActivityTitle')} message={t('adminFlow.activityLog.noActivityMessage')} />
          )}
        </Section>
        <Section 
          title={
            <div className="flex items-center gap-2">
              {t('adminFlow.activityLog.systemLogs')}
              <div className="relative group flex items-center">
                <span className="material-symbols-outlined text-[20px] text-outline cursor-help hover:text-primary transition-colors">info</span>
                <div className="absolute right-0 md:left-1/2 md:-translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all w-64 bg-inverse-surface text-inverse-on-surface text-xs p-3 rounded-lg shadow-overlay z-50 font-normal leading-relaxed pointer-events-none text-left md:text-center">
                  {t('adminFlow.activityLog.systemLogsTooltip')}
                </div>
              </div>
            </div>
          }
        >
          <div className="space-y-6 text-on-surface-variant">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setFilter('all')}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm p-6 text-center hover:border-secondary/50 transition-colors cursor-pointer group col-span-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">history</span>
                </div>
                <p className="font-display text-[28px] text-primary leading-none mb-1">{items.length}</p>
                <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{t('adminFlow.activityLog.filterAll')}</p>
              </button>

              <button 
                onClick={() => setFilter('user')}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm p-6 text-center hover:border-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <p className="font-display text-[28px] text-primary leading-none mb-1">{items.filter((item) => item.targetType === 'User' && item.performedBy !== 'Admin' && item.performedBy !== 'System').length}</p>
                <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{t('adminFlow.activityLog.userEvents')}</p>
              </button>
              
              <button 
                onClick={() => setFilter('company')}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm p-6 text-center hover:border-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">domain</span>
                </div>
                <p className="font-display text-[28px] text-primary leading-none mb-1">{items.filter((item) => item.targetType === 'Job' && item.performedBy !== 'Admin').length}</p>
                <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{t('adminFlow.activityLog.companyEvents')}</p>
              </button>

              <button 
                onClick={() => setFilter('job')}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm p-6 text-center hover:border-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">work</span>
                </div>
                <p className="font-display text-[28px] text-primary leading-none mb-1">{items.filter((item) => item.targetType === 'Job').length}</p>
                <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{t('adminFlow.activityLog.jobEvents')}</p>
              </button>
              
              <button 
                onClick={() => setFilter('admin')}
                className="rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm p-6 text-center hover:border-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <p className="font-display text-[28px] text-primary leading-none mb-1">{items.filter((item) => item.performedBy === 'Admin' || item.performedBy === 'System').length}</p>
                <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">{t('adminFlow.activityLog.adminOperations')}</p>
              </button>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

export function AdminSettings() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user, refreshUser } = useAuth();
  
  const [settings, setSettings] = useState({
    name: user?.name || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '', location: '' });
  const [savingContactInfo, setSavingContactInfo] = useState(false);

  const [unlockState, setUnlockState] = useState({ email: false, password: false });
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyTarget, setVerifyTarget] = useState(null); // 'email' | 'password'
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    getContactInfo().then((loadedContactInfo) => {
      if (!mounted) return;

      setContactInfo({
        email: loadedContactInfo.email || '',
        phone: loadedContactInfo.phone || '',
        location: loadedContactInfo.location || '',
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const updateContactField = (key, value) => setContactInfo((prev) => ({ ...prev, [key]: value }));

  const startVerify = (target) => {
    setVerifyTarget(target);
    setVerifyInput('');
    setVerifyError('');
  };

  const cancelVerify = () => {
    setVerifyTarget(null);
    setVerifyInput('');
    setVerifyError('');
  };

  const confirmVerify = async () => {
    if (!verifyInput) return;
    setVerifying(true);
    setVerifyError('');
    try {
      await adminApi.verifyPassword(verifyInput);
      setUnlockState(prev => ({ ...prev, [verifyTarget]: true }));
      // Store the verified password to send with the final save request
      setSettings(prev => ({ ...prev, currentPassword: verifyInput }));
      setVerifyTarget(null);
    } catch (e) {
      setVerifyError(t('adminFlow.settings.errors.incorrectPassword'));
    } finally {
      setVerifying(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!settings.name.trim()) next.name = t('adminFlow.settings.errors.nameRequired');
    if (unlockState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) next.email = t('adminFlow.settings.errors.emailInvalid');
    
    if (unlockState.password) {
      if (!settings.newPassword || settings.newPassword.length < 8) next.newPassword = t('adminFlow.settings.errors.passwordMin');
      if (settings.newPassword !== settings.confirmPassword) next.confirmPassword = t('adminFlow.settings.errors.passwordMatch');
    }
    
    setErrors(next);
    return !Object.keys(next).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await adminApi.updateSettings({
        name: settings.name,
        email: unlockState.email ? settings.email : undefined,
        currentPassword: settings.currentPassword || undefined,
        newPassword: unlockState.password ? settings.newPassword : undefined,
      });
      
      addToast({ title: t('adminFlow.settings.savedTitle'), message: t('adminFlow.settings.savedMessage'), type: 'success' });
      
      refreshUser();
      
      setSettings(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setUnlockState({ email: false, password: false });
    } catch (e) {
      addToast({ title: t('adminFlow.settings.updateFailedTitle'), message: e?.response?.data?.message || t('adminFlow.settings.updateFailedMessage'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveContactInfo = async () => {
    setSavingContactInfo(true);
    try {
      const savedContactInfo = await adminApi.updateContactInfo(contactInfo);

      setContactInfo({
        email: savedContactInfo?.email || '',
        phone: savedContactInfo?.phone || '',
        location: savedContactInfo?.location || '',
      });
      addToast({
        title: t('adminFlow.settings.contactInfo.savedTitle'),
        message: t('adminFlow.settings.contactInfo.savedMessage'),
        type: 'success',
      });
    } catch {
      addToast({
        title: t('adminFlow.settings.contactInfo.failedTitle'),
        message: t('adminFlow.settings.contactInfo.failedMessage'),
        type: 'error',
      });
    } finally {
      setSavingContactInfo(false);
    }
  };

  const renderVerifyBlock = (targetName) => (
    <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm mt-2">
      <p className="font-h3 text-primary mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-secondary">lock</span>
        {t('adminFlow.settings.securityCheck')}
      </p>
      <p className="font-body-sm text-on-surface-variant mb-4">{t('adminFlow.settings.securityHint', { targetName })}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="password" 
          className="flex-1 bg-surface border border-outline-variant rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" 
          placeholder={t('adminFlow.settings.currentPassword')}
          value={verifyInput}
          onChange={(e) => setVerifyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmVerify()}
        />
        <div className="flex gap-2">
          <button className={buttonSecondary} onClick={cancelVerify} disabled={verifying}>{t('buttons.cancel')}</button>
          <button className={buttonPrimary} onClick={confirmVerify} disabled={verifying || !verifyInput}>
            {verifying ? t('adminFlow.userDetails.verifying') : t('buttons.unlock')}
          </button>
        </div>
      </div>
      {verifyError && <p className="font-body-sm text-error mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{verifyError}</p>}
    </div>
  );

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminFlow.settings.eyebrow')}
        title={t('adminFlow.settings.title')}
        description={t('adminFlow.settings.description')}
      />
      <div className="flex flex-col gap-8">
        <Section title={t('adminFlow.settings.adminProfile')}>
          <div className="grid grid-cols-1 gap-6">
            <Field error={errors.name} label={t('adminFlow.settings.name')}>
              <TextInput onChange={(e) => update('name', e.target.value)} value={settings.name} />
            </Field>
            
            <div>
              <span className="font-label-md text-label-md text-primary block mb-1">{t('adminFlow.settings.emailAddress')}</span>
              {!unlockState.email ? (
                verifyTarget === 'email' ? renderVerifyBlock(t('adminFlow.settings.emailAddress').toLowerCase()) : (
                  <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5">
                    <span className="text-on-surface-variant font-body-md truncate">{user?.email}</span>
                    <button onClick={() => startVerify('email')} className="text-secondary font-semibold text-sm hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">edit</span> {t('adminFlow.settings.change')}
                    </button>
                  </div>
                )
              ) : (
                <Field error={errors.email}>
                  <TextInput type="email" onChange={(e) => update('email', e.target.value)} value={settings.email} />
                </Field>
              )}
            </div>
          </div>
        </Section>
        
        <Section title={t('adminFlow.settings.securityAndAuth')}>
          {!unlockState.password ? (
            verifyTarget === 'password' ? renderVerifyBlock(t('adminFlow.settings.passwordLabel').toLowerCase()) : (
              <div>
                <p className="text-on-surface-variant font-body-sm mb-4">{t('adminFlow.settings.passwordHint')}</p>
                <button onClick={() => startVerify('password')} className={buttonSecondary}>
                  <span className="material-symbols-outlined text-[20px]">key</span>
                  {t('adminFlow.settings.changePassword')}
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field error={errors.newPassword} label={t('adminFlow.settings.newPassword')}>
                <TextInput type="password" onChange={(e) => update('newPassword', e.target.value)} value={settings.newPassword} />
              </Field>
              <Field error={errors.confirmPassword} label={t('adminFlow.settings.confirmNewPassword')}>
                <TextInput type="password" onChange={(e) => update('confirmPassword', e.target.value)} value={settings.confirmPassword} />
              </Field>
            </div>
          )}
        </Section>

        <div className="flex justify-end pt-4 border-t border-outline-variant">
          <button className={buttonPrimary} disabled={saving} onClick={save}>
            <span className="material-symbols-outlined text-[20px]">save</span>
            {saving ? t('adminFlow.saving') : t('adminFlow.settings.saveChanges')}
          </button>
        </div>

        <Section title={t('adminFlow.settings.contactInfo.title')}>
          <p className="text-on-surface-variant font-body-sm">
            {t('adminFlow.settings.contactInfo.description')}
          </p>
          <div className="grid grid-cols-1 gap-6">
            <Field label={t('adminFlow.settings.contactInfo.emailLabel')}>
              <TextInput
                type="email"
                onChange={(e) => updateContactField('email', e.target.value)}
                value={contactInfo.email}
              />
            </Field>
            <Field label={t('adminFlow.settings.contactInfo.phoneLabel')}>
              <TextInput
                type="text"
                onChange={(e) => updateContactField('phone', e.target.value)}
                value={contactInfo.phone}
              />
            </Field>
            <Field label={t('adminFlow.settings.contactInfo.locationLabel')}>
              <TextInput
                type="text"
                onChange={(e) => updateContactField('location', e.target.value)}
                value={contactInfo.location}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button className={buttonPrimary} disabled={savingContactInfo} onClick={saveContactInfo}>
              <span className="material-symbols-outlined text-[20px]">save</span>
              {savingContactInfo ? t('adminFlow.saving') : t('adminFlow.settings.contactInfo.save')}
            </button>
          </div>
        </Section>
      </div>
    </>
  );
}
