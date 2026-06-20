import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../../components/ConfirmModal';
import AdminConfirmModal from '../../components/admin/AdminConfirmModal';
import ApplicantMatchScore from '../../components/company/ApplicantMatchScore';
import CompanyApplicantCard from '../../components/company/CompanyApplicantCard';
import CompanyApplicantTable from '../../components/company/CompanyApplicantTable';
import CompanyEmptyState from '../../components/company/CompanyEmptyState';
import CompanyJobCard from '../../components/company/CompanyJobCard';
import CompanyJobTable from '../../components/company/CompanyJobTable';
import CompanyPageHeader from '../../components/company/CompanyPageHeader';
import CompanySkillTag from '../../components/company/CompanySkillTag';
import CompanyStatsCard from '../../components/company/CompanyStatsCard';
import CompanyStatusBadge from '../../components/company/CompanyStatusBadge';
import { useToast } from '../../components/useToast';
import { useAuth } from '../../context/useAuth';
import { useValidationErrors } from '../../hooks/useValidationErrors';
import { companyDataService } from '../../services/companyDataService';
import { companyApi } from '../../api/companyApi';
import { ROUTES } from '../../utils/constants';
import Stagger from '../../motion/Stagger';
import Reveal from '../../motion/Reveal';

const salary = (job) => `$${Math.round(job.salaryMin / 1000)}k - $${Math.round(job.salaryMax / 1000)}k`;
const jobParam = (params) => params.jobId || params.id;
const toText = (value) => (Array.isArray(value) ? value.join('\n') : value || '');
const toList = (value) => String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);

const buttonPrimary = 'inline-flex items-center justify-center gap-unit bg-secondary text-on-secondary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed';
const buttonSecondary = 'inline-flex items-center justify-center gap-unit border border-outline-variant text-primary px-stack-md py-stack-sm rounded-lg font-h3 text-h3 hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const buttonDanger = 'inline-flex items-center justify-center gap-unit border border-error/30 text-error px-stack-md py-stack-sm rounded-lg font-h3 text-h3 hover:bg-error-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export function FullPageSpinner() {
  return (
    <div className="flex w-full min-h-[400px] items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-secondary">progress_activity</span>
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

function TextInput(props) {
  return <input className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary disabled:opacity-50" {...props} />;
}

function TextArea(props) {
  return <textarea className="w-full min-h-32 bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary disabled:opacity-50" {...props} />;
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
      <button className={buttonSecondary} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('companyFlow.previous')}</button>
      <span className="text-on-surface-variant font-label-md">{t('companyFlow.page', { page })}</span>
      <button className={buttonSecondary} disabled={itemsCount < 15} onClick={() => setPage(p => p + 1)}>{t('companyFlow.next')}</button>
    </div>
  );
}

function ApplicantActionModals({ shortlistTarget, rejectTarget, setShortlistTarget, setRejectTarget, onComplete }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [sendEmail, setSendEmail] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [rejectJob, setRejectJob] = useState(null);

  useEffect(() => {
    if (rejectTarget) {
      companyDataService.getCompanyJobById(rejectTarget.jobId).then(setRejectJob).catch(console.error);
    }
  }, [rejectTarget]);

  const updateStatus = async (target, status) => {
    try {
      setSaving(true);
      const nextStatus = target.nextStatus || status;
      await companyDataService.updateApplicantStatus(target.applicationId, nextStatus);
      addToast({
        title: nextStatus === 'shortlisted' ? t('companyFlow.shortlistedToastTitle') : nextStatus === 'under_review' ? t('companyFlow.unshortlistedToastTitle') : t('companyFlow.rejectedToastTitle'),
        message: t('companyFlow.statusMovedMessage', { name: target.name, status: nextStatus.replace('_', ' ') }),
      });
      onComplete?.();
    } catch (e) {
      addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.updateStatusError'), type: 'error' });
    } finally {
      setSaving(false);
      setShortlistTarget(null);
      setRejectTarget(null);
    }
  };

  return (
    <>
      <ConfirmModal
        confirmLabel={saving ? t('companyFlow.saving') : shortlistTarget?.nextStatus === 'under_review' ? t('companyFlow.unshortlistConfirm') : t('companyFlow.shortlistConfirm')}
        message={shortlistTarget ? (shortlistTarget.nextStatus === 'under_review' ? t('companyFlow.unshortlistMessage', { name: shortlistTarget.name }) : t('companyFlow.shortlistMessage', { name: shortlistTarget.name })) : ''}
        onCancel={() => setShortlistTarget(null)}
        onConfirm={() => updateStatus(shortlistTarget, 'shortlisted')}
        open={Boolean(shortlistTarget)}
        title={shortlistTarget?.nextStatus === 'under_review' ? t('companyFlow.unshortlistTargetTitle') : t('companyFlow.shortlistTargetTitle')}
      />

      {rejectTarget && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/40">
          <div className="bg-surface-container-lowest rounded-xl shadow-overlay border border-outline-variant p-stack-lg w-full max-w-2xl mx-4">
            <h3 className="font-h2 text-h2 text-primary">{t('companyFlow.rejectTitle')}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-unit">
              {t('companyFlow.rejectReviewText', { name: rejectTarget.name, job: rejectJob?.title || t('companyFlow.thisJob') })}
            </p>
            <div className="mt-stack-md flex flex-wrap gap-unit">
              {rejectTarget.missingSkills?.length ? rejectTarget.missingSkills.map((skill) => (
                <CompanySkillTag tone="missing" key={skill}>{skill}</CompanySkillTag>
              )) : <CompanySkillTag tone="matched">{t('companyFlow.noMissingSkills')}</CompanySkillTag>}
            </div>
            <label className="mt-stack-md flex items-center gap-stack-sm text-on-surface-variant">
              <input checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} type="checkbox" disabled={saving} />
              {t('companyFlow.sendRejectionEmail')}
            </label>
            {sendEmail && (
              <div className="mt-stack-md bg-surface-container-low rounded-lg p-stack-md border border-outline-variant">
                <p className="font-label-md text-label-md text-primary mb-unit">{t('companyFlow.emailPreview')}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t('companyFlow.rejectEmailBody', {
                    name: rejectTarget.name,
                    job: rejectJob?.title || t('companyFlow.ourRole'),
                    skills: rejectTarget.missingSkills?.join(', ') || t('companyFlow.roleCriteria'),
                  })}
                </p>
                <textarea
                  className="mt-stack-md w-full min-h-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 disabled:opacity-50"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('companyFlow.addRecruiterNote')}
                  value={note}
                  disabled={saving}
                />
              </div>
            )}
            <div className="mt-stack-lg flex justify-end gap-stack-sm">
              <button className={buttonSecondary} disabled={saving} onClick={() => setRejectTarget(null)}>{t('companyFlow.cancel')}</button>
              <button className={buttonDanger} disabled={saving} onClick={() => { updateStatus(rejectTarget, 'rejected'); setSendEmail(true); setNote(''); }}>
                {saving ? t('companyFlow.rejecting') : t('companyFlow.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function useApplicantActions(refresh) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [shortlistTarget, setShortlistTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  const modals = (
    <>
      <ApplicantActionModals
        onComplete={refresh}
        rejectTarget={rejectTarget}
        setRejectTarget={setRejectTarget}
        setShortlistTarget={setShortlistTarget}
        shortlistTarget={shortlistTarget}
      />
      <ConfirmModal
        confirmLabel={t('companyFlow.approveConfirm')}
        message={approveTarget ? t('companyFlow.approveMessage', { name: approveTarget.name }) : ''}
        onCancel={() => setApproveTarget(null)}
        onConfirm={async () => {
          try {
            await companyDataService.updateApplicantStatus(approveTarget.applicationId, 'approved');
            addToast({
              title: t('companyFlow.approvedToastTitle'),
              message: t('companyFlow.approvedToastMessage', { name: approveTarget.name }),
            });
            setApproveTarget(null);
            refresh?.();
          } catch (e) {
            addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.approveError'), type: 'error' });
          }
        }}
        open={Boolean(approveTarget)}
        title={t('companyFlow.approveTitle')}
      />
    </>
  );

  return { setShortlistTarget, setRejectTarget, setApproveTarget, modals };
}

function NotFoundState({ title, message }) {
  const { t } = useTranslation();
  return <CompanyEmptyState title={title || t('companyFlow.itemNotFound')} message={message || t('companyFlow.itemNotFoundMessage')} />;
}

function JobForm({ initialJob, mode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { errors, serverError, handleApiError, clearErrors, setErrors } = useValidationErrors();
  const [savingStatus, setSavingStatus] = useState(null); // 'draft', 'active', 'preview', etc
  const [form, setForm] = useState({
    title: initialJob?.title || '',
    category: initialJob?.category || '',
    location: initialJob?.location || '',
    workMode: initialJob?.workMode || 'Hybrid',
    type: initialJob?.type || '',
    salaryMin: initialJob?.salaryMin || 90000,
    salaryMax: initialJob?.salaryMax || 130000,
    description: initialJob?.description || '',
    responsibilities: toText(initialJob?.responsibilities),
    requiredSkills: toText(initialJob?.requiredSkills),
    experienceLevel: initialJob?.experienceLevel || '',
    education: initialJob?.education || '',
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    clearErrors();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = t('companyFlow.form.errors.titleRequired');
    if (!form.category.trim()) nextErrors.category = t('companyFlow.form.errors.categoryRequired');
    if (!form.location.trim()) nextErrors.location = t('companyFlow.form.errors.locationRequired');
    if (!form.type.trim()) nextErrors.type = t('companyFlow.form.errors.typeRequired');
    if (!form.description.trim()) nextErrors.description = t('companyFlow.form.errors.descriptionRequired');
    if (!toList(form.requiredSkills).length) nextErrors.requiredSkills = t('companyFlow.form.errors.skillsRequired');

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstError = Object.values(nextErrors)[0];
      addToast({ title: t('companyFlow.missingInfoTitle'), message: firstError, type: 'error' });
      return false;
    }
    return true;
  };

  const payload = (status) => ({
    ...form,
    salaryMin: Number(form.salaryMin),
    salaryMax: Number(form.salaryMax),
    responsibilities: toList(form.responsibilities),
    requiredSkills: toList(form.requiredSkills),
    status,
  });

  const save = async (status) => {
    if (!validate()) return;
    setSavingStatus(status);
    try {
      if (mode === 'edit') {
        const updated = await companyDataService.updateCompanyJob(initialJob.id, payload(status === 'preview' ? 'draft' : status));
        addToast({ title: t('companyFlow.form.jobUpdatedTitle'), message: t('companyFlow.form.jobUpdatedMessage', { title: updated.title }) });
        if (status === 'preview') {
          navigate(`/company/jobs/${updated.id}/preview`);
        } else {
          navigate(status === 'draft' ? ROUTES.COMPANY_JOBS : `/company/jobs/${updated.id}`);
        }
      } else {
        const created = await companyDataService.createCompanyJob(payload(status === 'preview' ? 'draft' : status));
        addToast({ title: status === 'draft' || status === 'preview' ? t('companyFlow.form.draftSavedTitle') : t('companyFlow.form.jobPublishedTitle'), message: t('companyFlow.form.jobSavedMessage', { title: created.title }) });
        navigate(status === 'preview' ? `/company/jobs/${created.id}/preview` : (status === 'draft' ? ROUTES.COMPANY_JOBS : `/company/jobs/${created.id}`));
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setSavingStatus(null);
    }
  };

  const isSaving = savingStatus !== null;

  return (
    <form className="space-y-gutter" onSubmit={(event) => event.preventDefault()}>
      {serverError && (
        <div className="bg-error-container text-on-error-container p-stack-sm rounded-lg border border-error">
          <p>{serverError}</p>
        </div>
      )}
      <Section title={t('companyFlow.form.basicInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
          <Field error={errors.title} label={t('companyFlow.form.jobTitle')}><TextInput disabled={isSaving} onChange={(event) =>
            update('title', event.target.value)} value={form.title} /></Field>
          <Field error={errors.category} label={t('companyFlow.form.category')}>
            <SelectInput disabled={isSaving} onChange={(event) => update('category', event.target.value)} value={form.category}>
              <option value="">{t('companyFlow.form.selectCategory')}</option>
              {['Engineering', 'Design', 'Marketing', 'Data Science', 'Finance', 'Customer Success', 'Operations', 'Human Resources', 'Other'].map((c) => (
                <option key={c} value={c}>{t(`categories.${c}`, { defaultValue: c })}</option>
              ))}
            </SelectInput>
          </Field>
          <Field error={errors.type} label={t('companyFlow.form.jobType')}>
            <SelectInput disabled={isSaving} onChange={(event) => update('type', event.target.value)} value={form.type}>
              <option value="">{t('companyFlow.form.selectType')}</option>
              {['full_time', 'part_time', 'contract', 'internship'].map((tp) => (
                <option key={tp} value={tp}>{t(`companyFlow.jobTypeOptions.${tp}`)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field error={errors.location} label={t('companyFlow.form.location')}><TextInput disabled={isSaving} onChange={(event) => update('location', event.target.value)} value={form.location} /></Field>
          <Field error={errors.workMode} label={t('companyFlow.form.workMode')}>
            <SelectInput disabled={isSaving} onChange={(event) => update('workMode', event.target.value)} value={form.workMode}>
              {['Remote', 'Hybrid', 'On-site'].map((m) => (
                <option key={m} value={m}>{t(`companyFlow.workModes.${m}`)}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Section>

      <Section title={t('companyFlow.form.description')}>
        <Field error={errors.description} label={t('companyFlow.form.jobDescription')}><TextArea disabled={isSaving} onChange={(event) => update('description', event.target.value)} value={form.description} /></Field>
      </Section>

      <Section title={t('companyFlow.form.responsibilities')}>
        <Field error={errors.responsibilities} label={t('companyFlow.form.responsibilitiesHint')}><TextArea disabled={isSaving} onChange={(event) => update('responsibilities', event.target.value)} value={form.responsibilities} /></Field>
      </Section>

      <Section title={t('companyFlow.form.requiredSkills')}>
        <Field error={errors.requiredSkills} label={t('companyFlow.form.skillsHint')}><TextArea disabled={isSaving} onChange={(event) => update('requiredSkills', event.target.value)} value={form.requiredSkills} /></Field>
        <div className="flex flex-wrap gap-unit">
          {toList(form.requiredSkills).map((skill) => <CompanySkillTag key={skill}>{skill}</CompanySkillTag>)}
        </div>
      </Section>

      <Section title={t('companyFlow.form.salaryExpEdu')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
          <Field error={errors.salaryMin} label={t('companyFlow.form.salaryMin')}>
            <TextInput
              disabled={isSaving}
              onChange={(event) => update('salaryMin', event.target.value.replace(/\D/g, '').slice(0, 7))}
              value={form.salaryMin ? Number(form.salaryMin).toLocaleString() : ''}
              placeholder={t('companyFlow.form.salaryMinPlaceholder')}
            />
          </Field>
          <Field error={errors.salaryMax} label={t('companyFlow.form.salaryMax')}>
            <TextInput
              disabled={isSaving}
              onChange={(event) => update('salaryMax', event.target.value.replace(/\D/g, '').slice(0, 7))}
              value={form.salaryMax ? Number(form.salaryMax).toLocaleString() : ''}
              placeholder={t('companyFlow.form.salaryMaxPlaceholder')}
            />
          </Field>
          <Field error={errors.experienceLevel} label={t('companyFlow.form.experienceLevel')}>
            <SelectInput disabled={isSaving} onChange={(event) => update('experienceLevel', event.target.value)} value={form.experienceLevel}>
              <option value="">{t('companyFlow.form.selectLevel')}</option>
              {['Internship', 'Entry Level / Junior', 'Mid Level', 'Senior', 'Lead / Manager', 'Director / Executive'].map((lvl) => (
                <option key={lvl} value={lvl}>{t(`experienceLevels.${lvl}`, { defaultValue: lvl })}</option>
              ))}
            </SelectInput>
          </Field>
          <Field error={errors.education} label={t('companyFlow.form.education')}><TextInput disabled={isSaving} onChange={(event) => update('education', event.target.value)} value={form.education} /></Field>
        </div>
      </Section>

      <div className="flex flex-wrap justify-end gap-stack-sm">
        <button type="button" disabled={isSaving} className={buttonSecondary} onClick={() => navigate(mode === 'edit' ? `/company/jobs/${initialJob.id}` : ROUTES.COMPANY_JOBS)}>{t('companyFlow.cancel')}</button>

        <button type="button" disabled={isSaving} className={buttonSecondary} onClick={() => save('draft')}>
          {savingStatus === 'draft' ? t('companyFlow.saving') : t('companyFlow.form.saveDraft')}
        </button>

        <button type="button" disabled={isSaving} className={buttonSecondary} onClick={() => save('preview')}>
          {savingStatus === 'preview' ? t('companyFlow.form.loading') : t('companyFlow.form.preview')}
        </button>

        <button type="button" disabled={isSaving} className={buttonPrimary} onClick={() => save('active')}>
          {savingStatus === 'active' ? t('companyFlow.form.publishing') : (mode === 'edit' ? t('companyFlow.form.publishChanges') : t('companyFlow.form.publishJob'))}
        </button>
      </div>
    </form>
  );
}

function UndoToast({ target, onClear }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg shadow-overlay flex items-center justify-between gap-4 w-auto min-w-[320px] max-w-[400px] animate-fade-up">
      <p className="font-body-sm truncate flex-1">{t('companyFlow.undoChatDeleted', { name: target.conv.candidate })}</p>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-label-sm w-4 text-center">{timeLeft}s</span>
        <button
          onClick={() => {
            target.restore();
            onClear();
          }}
          className="font-label-sm text-secondary hover:underline px-2 py-1 rounded hover:bg-secondary/10 transition-colors uppercase tracking-wider"
        >
          {t('companyFlow.undo')}
        </button>
      </div>
    </div>
  );
}

export function CompanyDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { addToast } = useToast();
  const [shortlistTarget, setShortlistTarget] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    companyApi.getDashboard()
      .then(res => setStats(res.data || res)) // Depending on axios interceptor unwrapping
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (target, status) => {
    try {
      await companyApi.updateApplicantStatus(target.application_id, status);
      addToast({
        title: status === 'shortlisted' ? t('companyFlow.shortlistedToastTitle') : t('companyFlow.rejectedToastTitle'),
        message: t('companyFlow.statusMovedMessage', { name: target.applicant_name, status }),
      });
      fetchData();
    } catch (e) {
      addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.updateStatusError'), type: 'error' });
    } finally {
      setShortlistTarget(null);
    }
  };

  const modals = (
    <AdminConfirmModal
      confirmLabel={t('companyFlow.shortlistConfirm')}
      message={shortlistTarget ? t('companyFlow.shortlistMessage', { name: shortlistTarget.applicant_name }) : ''}
      onCancel={() => setShortlistTarget(null)}
      onConfirm={() => updateStatus(shortlistTarget, 'shortlisted')}
      open={Boolean(shortlistTarget)}
      title={t('companyFlow.shortlistTargetTitle')}
    />
  );

  if (loading) return <FullPageSpinner />;
  if (error) return <CompanyEmptyState title={t('companyFlow.dashboard.errorTitle')} message={error} />;
  if (!stats) return null;

  return (
    <>
      <CompanyPageHeader
        actions={<Link className={buttonPrimary} to={ROUTES.COMPANY_CREATE_JOB}><span className="material-symbols-outlined text-[18px]">add</span>{t('companyFlow.dashboard.createJob')}</Link>}
        eyebrow={t('companyFlow.dashboard.eyebrow')}
        title={t('companyFlow.dashboard.title')}
        description={t('companyFlow.dashboard.description')}
      />

      {/* Overview Stats Row */}
      <Stagger as="div" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter" delayChildren={0.05} staggerChildren={0.07}>
        <Stagger.Item>
          <CompanyStatsCard icon="work" label={t('companyFlow.dashboard.totalJobs')} to={ROUTES.COMPANY_JOBS} value={stats.total_jobs} />
        </Stagger.Item>
        <Stagger.Item>
          <CompanyStatsCard icon="work_outline" label={t('companyFlow.dashboard.activeJobs')} to={ROUTES.COMPANY_JOBS} value={stats.active_jobs} />
        </Stagger.Item>
        <Stagger.Item>
          <CompanyStatsCard icon="group" label={t('companyFlow.dashboard.totalApplicants')} to={ROUTES.COMPANY_APPLICANTS} value={stats.total_applicants} />
        </Stagger.Item>
        <Stagger.Item>
          <CompanyStatsCard icon="new_releases" label={t('companyFlow.dashboard.newThisWeek')} to={ROUTES.COMPANY_APPLICANTS} value={stats.new_applicants_this_week} />
        </Stagger.Item>
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
        {/* Main Content Area */}
        <div className="xl:col-span-2 flex flex-col gap-gutter">
          <Reveal whenInView>
            <Section title={t('companyFlow.dashboard.recentApplicants')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
                {stats.recent_applicants?.map((applicant) => {
                  const isShortlisted = String(applicant.status || '').toLowerCase() === 'shortlisted';
                  return (
                    <div key={applicant.applicationId} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm hover:shadow-hover transition-shadow flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-h3 text-primary truncate pe-2">{applicant.name}</p>
                          <span className="bg-secondary/10 text-secondary text-xs font-bold px-2 py-1 rounded-full shrink-0">
                            {t('companyFlow.dashboard.percentMatch', { percent: applicant.matchScore })}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">work</span>
                          <span className="truncate">{applicant.job_title || applicant.title || t('companyFlow.dashboard.jobApplication')}</span>
                        </p>
                      </div>
                      <button onClick={() => setShortlistTarget({ ...applicant, nextStatus: isShortlisted ? 'under_review' : 'shortlisted' })} className={`w-full mt-2 text-center py-2 font-label-md rounded-lg transition-colors border ${isShortlisted ? 'border-outline-variant text-primary hover:bg-surface-container-high' : 'border-secondary/30 bg-surface-container-highest hover:bg-secondary/10 text-secondary'}`}>
                        {isShortlisted ? t('companyFlow.dashboard.unshortlistButton') : t('companyFlow.dashboard.shortlistButton')}
                      </button>
                    </div>
                  )
                })}
                {!stats.recent_applicants?.length && <p className="text-on-surface-variant p-4">{t('companyFlow.dashboard.noRecentApplicants')}</p>}
              </div>
            </Section>
          </Reveal>

          <Section title={t('companyFlow.dashboard.topPerformingJobs')}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
              {stats.top_jobs?.map((job) => (
                <div key={job.id} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <p className="font-h3 text-primary leading-tight">{job.title}</p>
                    <CompanyStatusBadge status={job.is_active ? 'active' : 'paused'} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant mt-auto">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>{t('companyFlow.dashboard.applicantsCount', { count: job.applicants_count })}</span>
                  </div>
                </div>
              ))}
              {!stats.top_jobs?.length && <p className="text-on-surface-variant p-4">{t('companyFlow.dashboard.noTopJobs')}</p>}
            </div>
          </Section>
        </div>

        {/* Sidebar Area */}
        <div className="flex flex-col gap-gutter">
          <Reveal whenInView>
            <Section title={t('companyFlow.dashboard.hiringPipeline')}>
              <div className="flex flex-col gap-stack-sm">
                <Link to={ROUTES.COMPANY_APPLICANTS} className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors rounded-xl p-4 border border-outline-variant flex justify-between items-center group">
                  <span className="text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-3 font-medium">
                    <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                    </div>
                    {t('companyFlow.dashboard.underReview')}
                  </span>
                  <span className="font-h2 text-primary">{stats.under_review}</span>
                </Link>

                <Link to={ROUTES.COMPANY_APPLICANTS} className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors rounded-xl p-4 border border-outline-variant flex justify-between items-center group">
                  <span className="text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-3 font-medium">
                    <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </div>
                    {t('companyFlow.dashboard.shortlisted')}
                  </span>
                  <span className="font-h2 text-primary">{stats.shortlisted}</span>
                </Link>

                <Link to={ROUTES.COMPANY_APPLICANTS} className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors rounded-xl p-4 border border-outline-variant flex justify-between items-center group">
                  <span className="text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-3 font-medium">
                    <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </div>
                    {t('companyFlow.dashboard.rejected')}
                  </span>
                  <span className="font-h2 text-primary">{stats.rejected}</span>
                </Link>
              </div>
            </Section>
          </Reveal>
        </div>
      </div>
      {modals}
    </>
  );
}

export function CompanyProfile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      companyDataService.getCompanyProfile(),
      companyDataService.getCompanyJobs({ status: 'active' })
    ]).then(([p, j]) => {
      setProfile(p);
      setActiveJobs(j);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (!profile) return <NotFoundState title={t('companyFlow.profile.profileNotFound')} />;

  return (
    <>
      <CompanyPageHeader
        actions={<><Link className={buttonSecondary} to={ROUTES.COMPANY_PROFILE + '/preview'}>
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          {t('companyFlow.profile.publicPreview')}
        </Link><Link className={buttonPrimary} to={ROUTES.COMPANY_PROFILE + '/edit'}>
            <span className="material-symbols-outlined text-[18px]">edit</span>
            {t('companyFlow.profile.editProfile')}
          </Link></>}
        eyebrow={t('companyFlow.profile.eyebrow')}
        title={profile.name}
        description={profile.description}
      />
      <Section title={t('companyFlow.profile.details')}>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-36 h-36 rounded-2xl bg-surface border border-outline-variant flex items-center justify-center p-2 shrink-0">
            {profile.logo ? (
              <img alt={profile.name} className="w-full h-full object-contain" src={profile.logo} />
            ) : (
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">domain</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {[
              [t('companyFlow.profile.industry'), profile.industry],
              [t('companyFlow.profile.website'), profile.website],
              [t('companyFlow.profile.location'), profile.location],
              [t('companyFlow.profile.contactEmail'), profile.contactEmail],
              [t('companyFlow.profile.phone'), profile.phone],
              [t('companyFlow.profile.founded'), profile.foundedYear],
              [t('companyFlow.profile.companySize'), profile.companySize],
              [t('companyFlow.profile.activeJobs'), activeJobs.length],
            ].map(([label, value]) => (
              <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-center" key={label}>
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">{label}</p>
                <p className="font-h3 text-h3 text-primary break-all">{value || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

export function CompanyEditProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { errors, serverError, handleApiError, clearErrors, setErrors } = useValidationErrors();
  const { patchUser, refreshUser } = useAuth();

  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    companyDataService.getCompanyProfile().then(p => {
      setForm(p);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const validate = () => {
    clearErrors();
    const nextErrors = {};
    if (!form.name?.trim()) nextErrors.name = t('companyFlow.profile.errors.nameRequired');
    if (!form.industry?.trim()) nextErrors.industry = t('companyFlow.profile.errors.industryRequired');
    if (!form.location?.trim()) nextErrors.location = t('companyFlow.profile.errors.locationRequired');

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await companyDataService.updateCompanyProfile(form);
      addToast({ title: t('companyFlow.profile.profileSavedTitle'), message: t('companyFlow.profile.profileSavedMessage') });
      navigate(ROUTES.COMPANY_PROFILE);
    } catch (err) {
      handleApiError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!form) return <NotFoundState />;

  return (
    <>
      <CompanyPageHeader eyebrow={t('companyFlow.profile.editEyebrow')} title={t('companyFlow.profile.editTitle')} description={t('companyFlow.profile.editDescription')} />
      {serverError && (
        <div className="bg-error-container text-on-error-container p-stack-sm rounded-lg border border-error">
          <p>{serverError}</p>
        </div>
      )}
      <Section title={t('companyFlow.profile.profileInformation')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
          <Field error={errors.name} label={t('companyFlow.profile.fields.companyName')}><TextInput disabled={saving} onChange={(event) => update('name', event.target.value)} value={form.name || ''} /></Field>
          <Field error={errors.industry} label={t('companyFlow.profile.fields.industry')}><TextInput disabled={saving} onChange={(event) => update('industry', event.target.value)} value={form.industry || ''} /></Field>
          <Field error={errors.website} label={t('companyFlow.profile.fields.website')}><TextInput disabled={saving} onChange={(event) => update('website', event.target.value)} value={form.website || ''} /></Field>
          <Field error={errors.location} label={t('companyFlow.profile.fields.location')}><TextInput disabled={saving} onChange={(event) => update('location', event.target.value)} value={form.location || ''} /></Field>
          <Field error={errors.contactEmail} label={t('companyFlow.profile.fields.contactEmail')}><TextInput disabled={saving} onChange={(event) => update('contactEmail', event.target.value)} value={form.contactEmail || ''} /></Field>
          <Field error={errors.phone} label={t('companyFlow.profile.fields.phone')}><TextInput disabled={saving} onChange={(event) => update('phone', event.target.value)} value={form.phone || ''} /></Field>
          <Field error={errors.foundedYear} label={t('companyFlow.profile.fields.foundedYear')}><TextInput disabled={saving} onChange={(event) => update('foundedYear', event.target.value)} type="number" value={form.foundedYear || ''} /></Field>
          <Field error={errors.companySize} label={t('companyFlow.profile.fields.companySize')}><TextInput disabled={saving} onChange={(event) => update('companySize', event.target.value)} value={form.companySize || ''} /></Field>
        </div>
        <Field error={errors.description} label={t('companyFlow.profile.fields.description')}><TextArea disabled={saving} onChange={(event) => update('description', event.target.value)} value={form.description || ''} /></Field>
        <Field label={t('companyFlow.profile.fields.logoUpload')}>
          <input
            className="block w-full text-on-surface-variant disabled:opacity-50"
            disabled={saving}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              setLogoFile(file?.name || '');
              if (file) {
                try {
                  const uploadResult = await companyDataService.uploadCompanyLogo(file);
                  const newLogoUrl = uploadResult?.logo_url || uploadResult?.data?.logo_url || null;
                  if (newLogoUrl) {
                    patchUser({ profile_image: newLogoUrl, avatar: newLogoUrl });
                  }
                  addToast({ title: t('companyFlow.profile.logoUploadedTitle'), message: t('companyFlow.profile.logoUploadedMessage') });
                  await refreshUser();
                } catch (e) {
                  addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.profile.logoUploadError'), type: 'error' });
                }
              }
            }}
            type="file"
          />
          {logoFile && <p className="font-body-sm text-body-sm text-on-surface-variant mt-unit">{t('companyFlow.profile.selectedFile', { name: logoFile })}</p>}
        </Field>
      </Section>
      <div className="flex justify-end gap-stack-sm mt-stack-md">
        <button disabled={saving} className={buttonSecondary} onClick={() => navigate(ROUTES.COMPANY_PROFILE)}>{t('companyFlow.cancel')}</button>
        <button disabled={saving} className={buttonPrimary} onClick={save}>{saving ? t('companyFlow.saving') : t('companyFlow.profile.saveChanges')}</button>
      </div>
    </>
  );
}

export function CompanyProfilePreview() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      companyDataService.getCompanyProfile(),
      companyDataService.getCompanyJobs({ status: 'active' })
    ]).then(([p, j]) => {
      setProfile(p);
      setActiveJobs(j);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (!profile) return <NotFoundState />;

  return (
    <>
      <CompanyPageHeader
        actions={<><Link className={buttonSecondary} to={ROUTES.COMPANY_PROFILE}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t('companyFlow.profile.preview.backToProfile')}
        </Link><Link className={buttonPrimary} to={ROUTES.COMPANY_PROFILE + '/edit'}>
            <span className="material-symbols-outlined text-[18px]">edit</span>
            {t('companyFlow.profile.editProfile')}
          </Link></>}
        eyebrow={t('companyFlow.profile.preview.eyebrow')}
        title={profile.name}
        description={profile.description}
      />
      <Section title={t('companyFlow.profile.preview.employerProfile')}>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-32 h-32 rounded-2xl bg-surface border border-outline-variant flex items-center justify-center p-2 shrink-0">
            {profile.logo ? (
              <img alt={profile.name} className="w-full h-full object-contain" src={profile.logo} />
            ) : (
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">domain</span>
            )}
          </div>
          <div className="space-y-2 text-on-surface-variant flex flex-col justify-center">
            <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">category</span> {profile.industry} · {profile.location}</p>
            <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">group</span> {profile.companySize} · {t('companyFlow.profile.preview.foundedPrefix')} {profile.foundedYear}</p>
            <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">language</span> <a href={profile.website} target="_blank" rel="noreferrer" className="text-secondary hover:underline">{profile.website}</a></p>
          </div>
        </div>
      </Section>
      <Section title={t('companyFlow.profile.preview.openJobs')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeJobs.map((job) => <CompanyJobCard job={job} key={job.id} />)}
        </div>
      </Section>
    </>
  );
}

export function CompanyManageJobs() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [filters, setFilters] = useState({ query: '', status: 'all', sort: 'newest' });
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyDataService.getCompanyJobs({ ...filters, page });
      setJobs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateFilters = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <CompanyPageHeader
        actions={<Link className={buttonPrimary} to={ROUTES.COMPANY_CREATE_JOB}><span className="material-symbols-outlined text-[18px]">add</span>{t('companyFlow.dashboard.createJob')}</Link>}
        eyebrow={t('companyFlow.manageJobs.eyebrow')}
        title={t('companyFlow.manageJobs.title')}
        description={t('companyFlow.manageJobs.description')}
      />
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient p-6 grid grid-cols-1 md:grid-cols-[1fr_160px_160px] gap-6 mb-8">
        <TextInput onChange={(event) => updateFilters('query', event.target.value)} placeholder={t('companyFlow.manageJobs.searchPlaceholder')} value={filters.query} />
        <SelectInput onChange={(event) => updateFilters('status', event.target.value)} value={filters.status}>
          {['all', 'active', 'draft', 'paused', 'closed'].map((s) => (
            <option key={s} value={s}>{t(`companyFlow.manageJobs.statusOptions.${s}`)}</option>
          ))}
        </SelectInput>
        <SelectInput onChange={(event) => updateFilters('sort', event.target.value)} value={filters.sort}>
          {['newest', 'applicants', 'views'].map((s) => (
            <option key={s} value={s}>{t(`companyFlow.manageJobs.sortOptions.${s}`)}</option>
          ))}
        </SelectInput>
      </div>

      {loading ? <FullPageSpinner /> : (
        <>
          <CompanyJobTable
            jobs={jobs}
            onDeleteRequest={setDeleteTarget}
            onToggleStatus={async (id) => {
              try {
                const updated = await companyDataService.toggleJobStatus(id);
                addToast({ title: t('companyFlow.manageJobs.statusUpdatedTitle'), message: t('companyFlow.manageJobs.statusUpdatedMessage', { title: updated.title, status: updated.status }) });
                refresh();
              } catch (e) {
                addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.manageJobs.statusUpdateError'), type: 'error' });
              }
            }}
          />
          <PaginationControls page={page} setPage={setPage} itemsCount={jobs.length} />
        </>
      )}

      <ConfirmModal
        confirmLabel={saving ? t('companyFlow.manageJobs.deletingButton') : t('companyFlow.manageJobs.deleteJob')}
        message={deleteTarget ? t('companyFlow.manageJobs.deleteMessage', { title: deleteTarget.title }) : ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          setSaving(true);
          try {
            await companyDataService.deleteCompanyJob(deleteTarget.id);
            addToast({ title: t('companyFlow.manageJobs.deletedTitle'), message: t('companyFlow.manageJobs.deletedMessage', { title: deleteTarget.title }) });
            setDeleteTarget(null);
            refresh();
          } catch (e) {
            addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.manageJobs.deleteError'), type: 'error' });
          } finally {
            setSaving(false);
          }
        }}
        open={Boolean(deleteTarget)}
        title={t('companyFlow.manageJobs.deleteTitle')}
        variant="danger"
      />
    </>
  );
}

export function CompanyCreateJobPost() {
  const { t } = useTranslation();
  return (
    <>
      <CompanyPageHeader eyebrow={t('companyFlow.createPost.eyebrow')} title={t('companyFlow.createPost.title')} description={t('companyFlow.createPost.description')} />
      <JobForm mode="create" />
    </>
  );
}

export function CompanyEditJobPost() {
  const { t } = useTranslation();
  const params = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyDataService.getCompanyJobById(jobParam(params)).then(res => {
      setJob(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params]);

  if (loading) return <FullPageSpinner />;
  if (!job) return <NotFoundState title={t('companyFlow.editPost.notFoundTitle')} message={t('companyFlow.editPost.notFoundMessage')} />;

  return (
    <>
      <CompanyPageHeader eyebrow={t('companyFlow.editPost.eyebrow')} title={job.title} description={t('companyFlow.editPost.description')} />
      <JobForm initialJob={job} mode="edit" />
    </>
  );
}

export function CompanyJobPostPreview() {
  const { t } = useTranslation();
  const params = useParams();
  const { addToast } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyDataService.getCompanyJobById(jobParam(params)).then(res => {
      setJob(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params]);

  const toggle = async () => {
    try {
      const updated = await companyDataService.toggleJobStatus(job.id);
      setJob(updated);
      addToast({ title: t('companyFlow.manageJobs.statusUpdatedTitle'), message: t('companyFlow.manageJobs.statusUpdatedMessage', { title: updated.title, status: updated.status }) });
    } catch (e) {
      addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.preview.statusUpdateError'), type: 'error' });
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!job) return <NotFoundState title={t('companyFlow.preview.notFoundTitle')} message={t('companyFlow.preview.notFoundMessage')} />;

  return (
    <>
      <CompanyPageHeader
        actions={<><Link className={buttonSecondary} to={`/company/jobs/${job.id}/edit`}>{t('companyFlow.preview.backToEdit')}</Link><button className={buttonPrimary} onClick={toggle}>{job.status === 'active' ? t('companyFlow.preview.pause') : t('companyFlow.preview.publish')}</button><Link className={buttonSecondary} to={`/company/jobs/${job.id}/applicants`}>{t('companyFlow.preview.viewApplicants')}</Link></>}
        eyebrow={t('companyFlow.preview.eyebrow')}
        title={job.title}
        description={`${job.location} · ${t(`companyFlow.workModes.${job.workMode}`, { defaultValue: job.workMode })} · ${t(`companyFlow.jobTypeOptions.${job.type}`, { defaultValue: job.type })}`}
      />
      <Section title={t('companyFlow.preview.previewTitle')}>
        <div className="flex items-center justify-between"><CompanyStatusBadge status={job.status} /><p className="font-h2 text-h2 text-primary">{salary(job)}</p></div>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{job.description}</p>
        <div className="flex flex-wrap gap-unit">{job.requiredSkills.map((skill) => <CompanySkillTag key={skill}>{skill}</CompanySkillTag>)}</div>
        <ul className="list-disc ps-6 text-on-surface-variant space-y-unit">{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
      </Section>
    </>
  );
}

export function CompanyJobDetails() {
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const id = jobParam(params);
      const j = await companyDataService.getCompanyJobById(id);
      setJob(j);
      try {
        const a = await companyDataService.getApplicantsByJob(id);
        setApplicants(a);
      } catch (applicantsError) {
        console.error(applicantsError);
        setApplicants([]);
      }
    } catch (e) {
      console.error(e);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { setShortlistTarget, setRejectTarget, setApproveTarget, modals } = useApplicantActions(fetchData);

  if (loading) return <FullPageSpinner />;
  if (!job) return <NotFoundState title={t('companyFlow.jobDetails.notFoundTitle')} message={t('companyFlow.jobDetails.notFoundMessage')} />;

  const averageScore = applicants.length ? Math.round(applicants.reduce((sum, item) => sum + item.matchScore, 0) / applicants.length) : 0;

  return (
    <>
      <CompanyPageHeader
        actions={<><Link className={buttonSecondary} to={`/company/jobs/${job.id}/applicants`}>{t('companyFlow.jobDetails.viewApplicants')}</Link><Link className={buttonSecondary} to={`/company/jobs/${job.id}/edit`}>{t('companyFlow.jobDetails.editJob')}</Link><Link className={buttonSecondary} to={`/company/jobs/${job.id}/preview`}>{t('companyFlow.jobDetails.preview')}</Link><button className={buttonPrimary} onClick={async () => { const updated = await companyDataService.toggleJobStatus(job.id); setJob(updated); addToast({ title: t('companyFlow.manageJobs.statusUpdatedTitle'), message: t('companyFlow.manageJobs.statusUpdatedMessage', { title: updated.title, status: updated.status }) }); }}>{job.status === 'active' ? t('companyFlow.jobDetails.pause') : t('companyFlow.jobDetails.publish')}</button><button className={buttonDanger} onClick={() => setDeleteOpen(true)}>{t('companyFlow.jobDetails.delete')}</button></>}
        eyebrow={t('companyFlow.jobDetails.eyebrow')}
        title={job.title}
        description={`${job.location} · ${t(`companyFlow.workModes.${job.workMode}`, { defaultValue: job.workMode })} · ${salary(job)}`}
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <CompanyStatsCard icon="visibility" label={t('companyFlow.jobDetails.views')} value={job.views} />
        <CompanyStatsCard icon="group" label={t('companyFlow.jobDetails.applicants')} value={applicants.length} />
        <CompanyStatsCard icon="analytics" label={t('companyFlow.jobDetails.avgMatch')} value={`${averageScore}%`} />
        <CompanyStatsCard icon="work" label={t('companyFlow.jobDetails.status')} value={<CompanyStatusBadge status={job.status} />} />
      </div>
      <Section title={t('companyFlow.jobDetails.jobOverview')}>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{job.description}</p>
        <div className="flex flex-wrap gap-unit">{job.requiredSkills.map((skill) => <CompanySkillTag key={skill}>{skill}</CompanySkillTag>)}</div>
        <ul className="list-disc ps-6 text-on-surface-variant space-y-unit">{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="text-on-surface-variant">{t('companyFlow.jobDetails.experiencePrefix')}: {t(`experienceLevels.${job.experienceLevel}`, { defaultValue: job.experienceLevel })} · {t('companyFlow.jobDetails.educationPrefix')}: {job.education}</p>
      </Section>
      <Section title={t('companyFlow.jobDetails.recentApplicants')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-md">
          {applicants.slice(0, 4).map((applicant) => <CompanyApplicantCard applicant={applicant} key={applicant.id} onReject={setRejectTarget} onShortlist={setShortlistTarget} onApprove={setApproveTarget} />)}
          {!applicants.length && <p className="text-on-surface-variant">{t('companyFlow.jobDetails.noApplicants')}</p>}
        </div>
      </Section>
      {modals}
      <ConfirmModal
        confirmLabel={t('companyFlow.jobDetails.deleteConfirm')}
        message={t('companyFlow.jobDetails.deleteMessage', { title: job.title })}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await companyDataService.deleteCompanyJob(job.id);
          addToast({ title: t('companyFlow.jobDetails.deletedTitle'), message: t('companyFlow.jobDetails.deletedMessage', { title: job.title }) });
          navigate(ROUTES.COMPANY_JOBS);
        }}
        open={deleteOpen}
        title={t('companyFlow.jobDetails.deleteTitle')}
        variant="danger"
      />
    </>
  );
}

export function CompanyApplicants() {
  const { t } = useTranslation();
  const params = useParams();
  const jobId = jobParam(params);

  const [filters, setFilters] = useState({ query: '', status: 'all', sort: 'match' });
  const [page, setPage] = useState(1);
  const [applicants, setApplicants] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (jobId) {
        const [j, a] = await Promise.all([
          companyDataService.getCompanyJobById(jobId),
          companyDataService.getApplicantsByJob(jobId, { ...filters, page })
        ]);
        setJob(j);
        setApplicants(a);
      } else {
        const a = await companyDataService.getApplicants({ ...filters, page });
        setJob({ title: t('companyFlow.applicants.allJobsLabel') });
        setApplicants(a);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [jobId, filters, page]);

  useEffect(() => { refresh(); }, [refresh]);
  const { setShortlistTarget, setRejectTarget, setApproveTarget, modals } = useApplicantActions(refresh);

  const updateFilters = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  if (loading && !job) return <FullPageSpinner />;
  if (!job) return <NotFoundState title={t('companyFlow.applicants.notFoundTitle')} message={t('companyFlow.applicants.notFoundMessage')} />;

  return (
    <>
      <CompanyPageHeader eyebrow={t('companyFlow.applicants.eyebrow')} title={t('companyFlow.applicants.title', { title: job.title })} description={t('companyFlow.applicants.description')} />
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient p-stack-md grid grid-cols-1 md:grid-cols-[1fr_180px_200px] gap-stack-md">
        <TextInput onChange={(event) => updateFilters('query', event.target.value)} placeholder={t('companyFlow.applicants.searchPlaceholder')} value={filters.query} />
        <SelectInput onChange={(event) => updateFilters('status', event.target.value)} value={filters.status}>
          {['all', 'new', 'under_review', 'shortlisted', 'rejected'].map((s) => (
            <option key={s} value={s}>{t(`companyFlow.applicants.statusOptions.${s}`)}</option>
          ))}
        </SelectInput>
        <SelectInput onChange={(event) => updateFilters('sort', event.target.value)} value={filters.sort}>
          {['match', 'newest', 'experience'].map((s) => (
            <option key={s} value={s}>{t(`companyFlow.applicants.sortOptions.${s}`)}</option>
          ))}
        </SelectInput>
      </div>

      {loading ? <FullPageSpinner /> : (
        <>
          <CompanyApplicantTable applicants={applicants} onApprove={setApproveTarget} onReject={setRejectTarget} onShortlist={setShortlistTarget} />
          <PaginationControls page={page} setPage={setPage} itemsCount={applicants.length} />
        </>
      )}

      {modals}
    </>
  );
}

export function CompanyApplicantProfile() {
  const { t } = useTranslation();
  const params = useParams();
  const [applicant, setApplicant] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const a = await companyDataService.getApplicantById(params.id);
      setApplicant(a);
      if (a) {
        setJob(await companyDataService.getCompanyJobById(a.jobId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const { setShortlistTarget, setRejectTarget, setApproveTarget, modals } = useApplicantActions(fetchData);

  if (loading) return <FullPageSpinner />;
  if (!applicant) return <NotFoundState title={t('companyFlow.applicantProfile.notFoundTitle')} message={t('companyFlow.applicantProfile.notFoundMessage')} />;

  const isShortlisted = String(applicant.status || '').toLowerCase() === 'shortlisted';
  const messagePath = applicant.userId ? `${ROUTES.COMPANY_MESSAGES}?user=${applicant.userId}&job=${applicant.jobId}&application=${applicant.id}&name=${encodeURIComponent(applicant.name)}` : ROUTES.COMPANY_MESSAGES;
  const profileActionBase = 'h-14 w-full sm:w-[260px] px-stack-lg py-stack-md text-center whitespace-nowrap text-base font-semibold';
  const primaryActions = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-sm w-full">
      <button className={`${buttonPrimary} ${profileActionBase}`} onClick={() => setApproveTarget(applicant)}>
        <span className="material-symbols-outlined text-[18px]">verified</span>
        {t('companyFlow.applicantProfile.approve')}
      </button>
      <button className={`${isShortlisted ? buttonSecondary : buttonPrimary} ${profileActionBase}`} onClick={() => setShortlistTarget({ ...applicant, nextStatus: isShortlisted ? 'under_review' : 'shortlisted' })}>
        <span className="material-symbols-outlined text-[18px]">{isShortlisted ? 'undo' : 'check_circle'}</span>
        {isShortlisted ? t('companyFlow.applicantProfile.unshortlist') : t('companyFlow.applicantProfile.shortlist')}
      </button>
      {isShortlisted ? <Link className={`${buttonSecondary} ${profileActionBase}`} to={messagePath}><span className="material-symbols-outlined text-[18px]">chat</span>{t('companyFlow.applicantProfile.messageCandidate')}</Link> : <div className={`${profileActionBase} hidden sm:block invisible`} />}
    </div>
  );
  const secondaryActions = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-sm w-full">
      <button className={`${buttonDanger} ${profileActionBase}`} onClick={() => setRejectTarget(applicant)}>
        <span className="material-symbols-outlined text-[18px]">cancel</span>
        {t('companyFlow.applicantProfile.reject')}
      </button>
      <button className={`${buttonSecondary} ${profileActionBase}`} onClick={async () => {
        const blob = await companyDataService.getApplicantCV(applicant.id);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cv-${applicant.name}.pdf`);
        document.body.appendChild(link);
        link.click();
      }}>
        <span className="material-symbols-outlined text-[18px]">download</span>
        {t('companyFlow.applicantProfile.downloadCv')}
      </button>
      <Link className={`${buttonSecondary} ${profileActionBase}`} to={`/company/jobs/${applicant.jobId}/applicants`}>
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {t('companyFlow.applicantProfile.backToApplicants')}
      </Link>
    </div>
  );

  return (
    <>
      <CompanyPageHeader
        actions={<div className="w-full sm:w-auto flex flex-col gap-stack-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-stack-sm shadow-sm">{primaryActions}{secondaryActions}</div>}
        eyebrow={t('companyFlow.applicantProfile.eyebrow')}
        title={applicant.name}
        description={t('companyFlow.applicantProfile.applicantSubtitle', { title: applicant.title, job: job?.title || t('companyFlow.applicantProfile.selectedRole') })}
      />
      <div className="flex flex-col gap-8">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="h-32 bg-secondary/10 relative overflow-hidden">
            <div className="absolute top-0 end-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <span className="material-symbols-outlined text-[150px] text-secondary">person</span>
            </div>
          </div>
          <div className="px-8 pb-8 relative">
            <div className="w-24 h-24 rounded-full bg-surface border-4 border-surface-container-lowest flex items-center justify-center font-display text-h1 text-primary shadow-sm -mt-12 mb-4 overflow-hidden">
              {applicant.avatar ? <img alt={applicant.name} className="w-full h-full object-cover" src={applicant.avatar} /> : applicant.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-8">
              <div className="max-w-3xl">
                <h1 className="font-display text-h2 text-primary">{applicant.name}</h1>
                <p className="font-body-lg text-on-surface-variant mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">email</span>
                  {applicant.email || t('companyFlow.applicantProfile.noEmail')}
                </p>
                {applicant.location && <p className="font-body-md text-on-surface-variant mt-1 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">location_on</span>{applicant.location}</p>}
                {applicant.phone && <p className="font-body-md text-on-surface-variant mt-1 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">call</span>{applicant.phone}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[180px_160px_minmax(260px,1fr)] gap-3 items-stretch">
                <div className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 min-h-[96px] flex flex-col justify-center">
                  <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2">{t('companyFlow.applicantProfile.applicationStatus')}</p>
                  <CompanyStatusBadge status={applicant.status} />
                </div>
                <div className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 min-h-[96px] flex flex-col justify-center">
                  <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">work</span>{t('companyFlow.applicantProfile.experience')}</p>
                  <p className="font-h3 text-primary">{t('companyFlow.applicantProfile.yearsLabel', { years: applicant.yearsExperience })}</p>
                </div>
                <div className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 min-h-[96px] flex flex-col justify-center">
                  <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">school</span>{t('companyFlow.applicantProfile.education')}</p>
                  <p className="font-body-md text-primary leading-relaxed" title={applicant.education}>{applicant.education}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-outline-variant grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <div>
                <h3 className="font-h3 text-primary mb-3">{t('companyFlow.applicantProfile.topSkills')}</h3>
                <div className="flex flex-wrap gap-2">
                  {applicant.skills?.length > 0 ? applicant.skills.map((skill) => <CompanySkillTag key={skill}>{skill}</CompanySkillTag>) : <p className="text-sm italic text-on-surface-variant">{t('companyFlow.applicantProfile.noSkills')}</p>}
                </div>
              </div>
              <Link to={`/company/applicants/${applicant.id}/matching`} className="block bg-surface-container-low rounded-xl p-4 border border-outline-variant hover:border-secondary hover:shadow-hover transition-all">
                <p className="font-h3 text-primary mb-3">{t('companyFlow.applicantProfile.aiMatch')}</p>
                <div className="flex justify-center"><ApplicantMatchScore score={applicant.matchScore} size="lg" /></div>
                <p className="font-label-md text-label-md text-primary mt-4 mb-2">{t('companyFlow.applicantProfile.missingSkills')}</p>
                <div className="flex flex-wrap gap-2">
                  {applicant.missingSkills?.length ? applicant.missingSkills.map((skill) => <CompanySkillTag tone="missing" key={skill}>{skill}</CompanySkillTag>) : <CompanySkillTag tone="matched">{t('companyFlow.applicantProfile.noMissingDetected')}</CompanySkillTag>}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {modals}
    </>
  );
}

export function CompanyApplicantCvViewer() {
  const { t } = useTranslation();
  return <NotFoundState title={t('companyFlow.cvViewer.title')} message={t('companyFlow.cvViewer.message')} />;
}

export function CompanyApplicantMatchingDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [applicant, setApplicant] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const a = await companyDataService.getApplicantById(id);
      setApplicant(a);
      if (a) {
        setJob(await companyDataService.getCompanyJobById(a.jobId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const { setShortlistTarget, setRejectTarget, setApproveTarget, modals } = useApplicantActions(fetchData);

  if (loading) return <FullPageSpinner />;
  if (!applicant || !job) return <NotFoundState title={t('companyFlow.matching.notFoundTitle')} message={t('companyFlow.matching.notFoundMessage')} />;
  const recommendation = applicant.matchScore >= 85 ? t('companyFlow.matching.strong') : applicant.matchScore >= 70 ? t('companyFlow.matching.needsReview') : t('companyFlow.matching.low');

  return (
    <>
      <CompanyPageHeader
        actions={<div className="flex flex-col items-start sm:items-end gap-unit"><div className="flex flex-wrap gap-unit"><button className={buttonPrimary} onClick={() => setApproveTarget(applicant)}>{t('companyFlow.matching.approve')}</button><button className={buttonSecondary} onClick={() => setShortlistTarget({ ...applicant, nextStatus: 'shortlisted' })}>{t('companyFlow.matching.shortlist')}</button></div><div className="flex flex-wrap gap-unit"><button className={buttonDanger} onClick={() => setRejectTarget(applicant)}>{t('companyFlow.matching.reject')}</button><Link className={buttonSecondary} to={`/company/applicants/${applicant.id}`}>{t('companyFlow.matching.viewProfile')}</Link></div></div>}
        eyebrow={t('companyFlow.matching.eyebrow')}
        title={`${applicant.name} · ${recommendation}`}
        description={t('companyFlow.matching.evaluatedAgainst', { title: job.title })}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-8">
        <div className="flex flex-col gap-6">
          <Section title={t('companyFlow.matching.matchScore')}>
            <div className="flex justify-center py-4 border-b border-outline-variant mb-4">
              <ApplicantMatchScore score={applicant.matchScore} size="lg" />
            </div>
            <div className="flex justify-center">
              <CompanyStatusBadge status={applicant.status} />
            </div>
          </Section>
        </div>
        <Section title={t('companyFlow.matching.requiredChecklist')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {job.requiredSkills.length ? job.requiredSkills.map((skill) => {
              const normalize = (value) => String(value || '').trim().toLowerCase();
              const applicantSkills = (applicant.skills || []).map(normalize);
              const missingSkills = (applicant.missingSkills || []).map(normalize);
              const normalizedSkill = normalize(skill);
              const matched = applicantSkills.includes(normalizedSkill) && !missingSkills.includes(normalizedSkill);
              return (
                <div className="flex items-center gap-3 bg-surface-container-low rounded-xl p-4 border border-outline-variant shadow-sm" key={skill}>
                  <span className={`material-symbols-outlined text-[24px] ${matched ? 'text-success' : 'text-error'}`}>{matched ? 'check_circle' : 'cancel'}</span>
                  <span className="font-body-md text-primary font-medium">{skill}</span>
                </div>
              );
            }) : <CompanyEmptyState title={t('companyFlow.matching.noRequiredTitle')} message={t('companyFlow.matching.noRequiredMessage')} />}
          </div>
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant shadow-sm space-y-3">
            <p className="text-on-surface-variant font-body-md flex items-center gap-2"><span className="material-symbols-outlined text-secondary">work</span> {t('companyFlow.matching.expMatch')} <span className="font-bold text-primary">{t('companyFlow.matching.expValue', { years: applicant.yearsExperience })}</span> {t('companyFlow.matching.expSuffix', { level: t(`experienceLevels.${job.experienceLevel}`, { defaultValue: job.experienceLevel }) })}</p>
            <p className="text-on-surface-variant font-body-md flex items-center gap-2"><span className="material-symbols-outlined text-secondary">school</span> {t('companyFlow.matching.eduMatch')} <span className="font-bold text-primary">{applicant.education}</span></p>
            <div className="border-t border-outline-variant pt-3 mt-3">
              <p className="font-h3 text-h3 text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">psychology</span>
                {t('companyFlow.matching.recommendation')} <span className={applicant.matchScore >= 85 ? 'text-success' : applicant.matchScore >= 70 ? 'text-secondary' : 'text-error'}>{recommendation}</span>
              </p>
            </div>
          </div>
        </Section>
      </div>
      {modals}
    </>
  );
}

export function CompanyNotifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    companyDataService.getCompanyNotifications()
      .then((items) => {
        setNotifications(items);
      })
      .catch((error) => {
        console.error(error);
        addToast({ title: t('companyFlow.notifications.errorTitle'), message: t('companyFlow.notifications.errorMessage'), type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const visibleNotifications = notifications.filter((notification) => {
    const type = notification.type || notification.data?.type;
    if (filter === 'unread') return !notification.read_at && !notification.read;
    if (filter === 'messages') return type === 'message_received' || type === 'message';
    if (filter === 'applications') return type === 'application_submitted' || type === 'application_update';
    if (filter === 'views') return type === 'job_viewed';
    return true;
  });
  const unreadCount = notifications.filter((notification) => !notification.read_at && !notification.read).length;

  const toneFor = (type) => {
    if (type === 'message_received' || type === 'message') return { icon: 'chat', className: 'bg-primary-container text-on-primary-container' };
    if (type === 'application_submitted' || type === 'application_update') return { icon: 'person_add', className: 'bg-success-container text-success' };
    if (type === 'job_viewed') return { icon: 'visibility', className: 'bg-secondary-container text-on-secondary-container' };
    if (type === 'interview_reminder') return { icon: 'event_available', className: 'bg-secondary-container text-on-secondary-container' };
    return { icon: 'notifications', className: 'bg-surface-container-high text-on-surface-variant' };
  };

  const markAll = async () => {
    try {
      await companyDataService.markAllNotificationsRead();
      refresh();
    } catch (error) {
      console.error(error);
      addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.notifications.markAllError'), type: 'error' });
    }
  };

  const openNotification = async (notification) => {
    if (!notification.read_at && !notification.read) {
      await companyDataService.markNotificationRead(notification.id).catch(console.error);
      setNotifications((prev) => prev.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString(), read: true } : item));
    }

    const type = notification.type || notification.data?.type;
    const senderId = notification.sender_id || notification.data?.sender_id;
    const jobId = notification.job_id || notification.data?.job_id;
    const applicationId = notification.application_id || notification.data?.application_id;

    if ((type === 'message_received' || type === 'message') && (senderId || jobId)) {
      navigate(`${ROUTES.COMPANY_MESSAGES}?user=${senderId || ''}&job=${jobId || ''}`);
    } else if ((type === 'application_submitted' || type === 'application_update') && applicationId) {
      navigate(`/company/applicants/${applicationId}`);
    } else if (type === 'job_viewed' && jobId) {
      navigate(`/company/jobs/${jobId}`);
    }
  };

  return (
    <div className="w-full max-w-7xl space-y-gutter">
      <CompanyPageHeader
        actions={<button className={buttonSecondary} disabled={!unreadCount} onClick={markAll} type="button"><span className="material-symbols-outlined text-[18px]">done_all</span>{t('companyFlow.notifications.markAll')}</button>}
        eyebrow={t('companyFlow.notifications.eyebrow')}
        title={t('companyFlow.notifications.title')}
        description={t('companyFlow.notifications.description')}
      />
      <div className="flex flex-wrap gap-unit">{['all', 'unread', 'messages', 'applications', 'views'].map((item) => <button className={`${filter === item ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'} px-stack-md py-stack-sm rounded-lg font-label-md text-label-md transition-colors`} key={item} onClick={() => setFilter(item)} type="button">{t(`companyFlow.notifications.filters.${item}`)}</button>)}</div>
      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-ambient">
        {loading ? <FullPageSpinner /> : (!visibleNotifications.length ? <CompanyEmptyState title={t('companyFlow.notifications.emptyTitle')} message={t('companyFlow.notifications.emptyMessage')} /> : visibleNotifications.map((notification) => {
          const type = notification.type || notification.data?.type;
          const tone = toneFor(type);
          const unread = !notification.read_at && !notification.read;

          return (
            <button className={`w-full border-b border-outline-variant p-stack-lg text-start transition-colors last:border-b-0 ${unread ? 'bg-secondary-container/10 hover:bg-secondary-container/20' : 'hover:bg-surface-container-low'}`} key={notification.id} onClick={() => openNotification(notification)} type="button">
              <div className="flex items-start gap-stack-md">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone.className}`}>
                  <span className="material-symbols-outlined">{notification.icon || tone.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className={`font-h3 text-h3 ${unread ? 'text-primary' : 'text-on-surface'}`}>{notification.title || notification.data?.title || t('companyFlow.notifications.fallbackTitle')}</h3>
                    <span className="whitespace-nowrap text-label-sm text-on-surface-variant">{new Date(notification.created_at || Date.now()).toLocaleString()}</span>
                  </div>
                  <p className="mt-unit text-body-md text-on-surface-variant">{notification.message || notification.data?.message}</p>
                </div>
                {unread && <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-secondary" aria-hidden="true" />}
              </div>
            </button>
          );
        }))}
      </section>
    </div>
  );
}

export function CompanyMessages() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { addToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [interviewTime, setInterviewTime] = useState('');
  const [editingInterview, setEditingInterview] = useState(false);
  const [interviews, setInterviews] = useState(() => JSON.parse(localStorage.getItem('scheduled_interviews') || '{}'));
  const [muteAllMessages, setMuteAllMessages] = useState(() => localStorage.getItem('muted_messages_all') === 'true');
  const [mutedConversations, setMutedConversations] = useState(() => JSON.parse(localStorage.getItem('muted_message_conversations') || '[]'));
  const [mutePulse, setMutePulse] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [messageQuery, setMessageQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, conversation: item });
  };

  const conversationKey = (conversation) => `${conversation?.other_user_id || ''}-${conversation?.job_id || ''}`;
  const active = conversations.find((item) => item.id === activeId);
  const activeConversationKey = conversationKey(active);
  const filteredConversations = conversations.filter((item) => {
    const query = messageQuery.trim().toLowerCase();
    if (!query) return true;

    return [item.candidate, item.role, item.last_message, item.status, item.company]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const saveInterviews = (next) => {
    setInterviews({ ...next });
    localStorage.setItem('scheduled_interviews', JSON.stringify(next));
    window.dispatchEvent(new Event('interviews_updated'));
  };

  useEffect(() => {
    const handleUpdate = () => {
      setInterviews(JSON.parse(localStorage.getItem('scheduled_interviews') || '{}'));
    };
    window.addEventListener('interviews_updated', handleUpdate);
    return () => window.removeEventListener('interviews_updated', handleUpdate);
  }, []);

  const scheduledInterviewData = active ? interviews[activeConversationKey] : null;
  const scheduledInterview = typeof scheduledInterviewData === 'object' ? scheduledInterviewData?.time : scheduledInterviewData;

  const toggleMuteAllMessages = () => {
    setMutePulse('all');
    window.setTimeout(() => setMutePulse(null), 350);
    setMuteAllMessages((prev) => {
      const next = !prev;
      localStorage.setItem('muted_messages_all', String(next));
      return next;
    });
  };

  const toggleMuteConversation = (conversation) => {
    const key = conversationKey(conversation);
    setMutePulse(key);
    window.setTimeout(() => setMutePulse(null), 350);
    setMutedConversations((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key];
      localStorage.setItem('muted_message_conversations', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    companyDataService.getCompanyMessages().then(data => {
      const params = new URLSearchParams(location.search);
      const targetUser = params.get('user');
      const targetJob = params.get('job');
      const targetApplication = params.get('application');
      const targetName = params.get('name');
      let nextConversations = data;

      if (targetUser && !nextConversations.some((item) => String(item.other_user_id) === String(targetUser) && String(item.job_id || '') === String(targetJob || ''))) {
        nextConversations = [{
          id: `draft-${targetUser}-${targetJob || 'general'}`,
          other_user_id: Number(targetUser),
          candidate: targetName || t('companyFlow.messages.selectedCandidate'),
          role: targetJob ? t('companyFlow.messages.jobConversation') : t('companyFlow.messages.generalConversation'),
          job_id: targetJob ? Number(targetJob) : null,
          application_id: targetApplication ? Number(targetApplication) : null,
          last_message: '',
          time: t('companyFlow.messages.newTag'),
          unread: false,
          status: t('companyFlow.messages.shortlistedFallback'),
        }, ...nextConversations];
      }

      setConversations(nextConversations);
      if (nextConversations.length > 0) {
        const requested = targetUser ? nextConversations.find((item) => String(item.other_user_id) === String(targetUser) && String(item.job_id || '') === String(targetJob || '')) : null;
        setActiveId((requested || nextConversations[0]).id);
      }
      setLoading(false);
    });
  }, [location.search]);

  useEffect(() => {
    if (activeId) {
      const conv = conversations.find(c => c.id === activeId);
      if (conv) {
        companyDataService.getCompanyConversation(conv.other_user_id, conv.job_id).then(msgs => {
          setMessages(msgs);
        });
        if (conv.unread) {
          companyDataService.markMessagesAsRead(conv.other_user_id).then(() => {
            setConversations(prev => prev.map(c => c.id === activeId ? { ...c, unread: false } : c));
          });
        }
      }
    }
  }, [activeId, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [activeId, messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeId) return;
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;

    try {
      const sent = await companyDataService.sendCompanyMessage(conv.other_user_id, newMessage, conv.job_id);
      setMessages(prev => [...prev, { id: sent.id, from: t('companyFlow.messages.youLabel'), text: sent.content, created_at: sent.created_at }]);
      setNewMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleScheduleInterview = async () => {
    // Prevent schedule if input is empty, even if activeId exists
    if (!activeId || !interviewTime) return;
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;

    // strip _passed if user is rescheduling
    const cleanTime = interviewTime.replace('_passed', '');
    const dateLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    const formatted = new Date(cleanTime).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' });
    const text = t('companyFlow.messages.interviewScheduledText', { date: formatted });

    try {
      const sent = await companyDataService.sendCompanyMessage(conv.other_user_id, text, conv.job_id, { interview_at: cleanTime });
      setMessages(prev => [...prev, { id: sent.id, from: t('companyFlow.messages.youLabel'), text: sent.content, created_at: sent.created_at }]);

      const payload = {
        time: cleanTime,
        candidate: conv.candidate,
        job_id: conv.job_id,
        other_user_id: conv.other_user_id,
      };
      saveInterviews({ ...interviews, [conversationKey(conv)]: payload });

      const delay = new Date(cleanTime).getTime() - Date.now();
      if (delay <= 0) {
        // immediately mark as passed if scheduling in the past
        saveInterviews({ ...interviews, [conversationKey(conv)]: { ...payload, time: cleanTime + '_passed' } });
      }

      setInterviewTime('');
      setEditingInterview(false);
    } catch (e) {
      console.error(e);
    }
  };

  const [undoTarget, setUndoTarget] = useState(null);

  const handleDeleteConversation = async (convToDelete) => {
    const conv = convToDelete || active;
    if (!conv) return;

    // Remove from UI immediately for snappy feel
    const prevConversations = [...conversations];
    const prevMessages = [...messages];
    const prevActiveId = activeId;

    setConversations((prev) => prev.filter((item) => item.id !== conv.id));
    if (activeId === conv.id) {
      setMessages([]);
      setActiveId(null);
    }

    setContextMenu(null);

    const target = {
      conv,
      isUndone: false,
      restore: () => {
        target.isUndone = true;
        setConversations(prevConversations);
        if (prevActiveId === conv.id) {
          setMessages(prevMessages);
          setActiveId(prevActiveId);
        }
        setUndoTarget(null);
      }
    };

    setUndoTarget(target);

    // Wait 5 seconds to see if user undid the action
    setTimeout(async () => {
      if (target.isUndone) return;

      try {
        await companyDataService.deleteCompanyConversation(conv.other_user_id, conv.job_id);
        const key = conversationKey(conv);
        const nextInterviews = { ...interviews };
        delete nextInterviews[key];
        saveInterviews(nextInterviews);
      } catch (e) {
        console.error(e);
        // If delete fails, revert UI
        setConversations(prevConversations);
        if (prevActiveId === conv.id) {
          setMessages(prevMessages);
          setActiveId(prevActiveId);
        }
        addToast({ title: t('companyFlow.errorTitle'), message: t('companyFlow.messages.deleteError'), type: 'error' });
      }
      setUndoTarget((current) => current === target ? null : current);
    }, 5000);
  };

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-secondary mb-1">{t('companyFlow.messages.eyebrow')}</p>
            <h1 className="font-h2 text-h2 text-primary">{t('companyFlow.messages.title')}</h1>
          </div>
          <button className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${muteAllMessages ? 'bg-surface-container-high text-on-surface-variant border border-outline-variant' : 'bg-secondary text-on-secondary hover:opacity-90'} ${mutePulse === 'all' ? 'animate-scale-in' : ''}`} onClick={toggleMuteAllMessages}>
            <span className="material-symbols-outlined text-[20px]">{muteAllMessages ? 'notifications_off' : 'notifications_active'}</span>
            {muteAllMessages ? t('companyFlow.messages.unmuteAll') : t('companyFlow.messages.muteAll')}
          </button>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 flex-1 min-h-0 overflow-hidden">
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient overflow-hidden flex flex-col min-h-0">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-h2 text-h2 text-primary">{t('companyFlow.messages.inbox')}</h2>
              <span className="text-sm text-on-surface-variant">{t('companyFlow.messages.chatsCount', { count: filteredConversations.length })}</span>
            </div>
            <div className="px-4 pb-4 border-b border-outline-variant">
              <label className="relative block">
                <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  className="w-full rounded-full border border-outline-variant bg-surface-container-low py-2 ps-10 pe-3 text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  onChange={(event) => setMessageQuery(event.target.value)}
                  placeholder={t('companyFlow.messages.searchPlaceholder')}
                  value={messageQuery}
                />
              </label>
            </div>
            <div className="divide-y divide-outline-variant overflow-y-auto flex-1 p-2">
              {loading ? <FullPageSpinner /> : (
                filteredConversations.length === 0 ? <CompanyEmptyState title={t('companyFlow.messages.emptyTitle')} message={messageQuery ? t('companyFlow.messages.emptySearchMessage') : t('companyFlow.messages.emptyMessage')} /> :
                  filteredConversations.map((item) => (
                    <div
                      key={item.id}
                      className={`w-full py-4 transition-colors hover:bg-surface-container-low rounded-lg px-4 cursor-pointer select-none ${active?.id === item.id ? 'bg-secondary-container/15' : ''}`}
                      onClick={() => setActiveId(item.id)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold shrink-0">
                          {item.candidate?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <Link className="font-h3 text-h3 text-primary hover:text-secondary truncate block" to={item.application_id ? `/company/applicants/${item.application_id}` : '#'}>{item.candidate}</Link>
                            <span className="flex shrink-0 items-center gap-2 mt-1">
                              {mutedConversations.includes(conversationKey(item)) && <span className="material-symbols-outlined text-[16px] text-on-surface-variant" title={t('companyFlow.messages.mutedTitle')}>notifications_off</span>}
                              {item.unread && <span className="h-2.5 w-2.5 rounded-full bg-secondary" aria-hidden="true" />}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-sm truncate">{item.role}</p>
                          <p className="mt-2 text-body-sm text-on-surface-variant truncate">{item.last_message || t('companyFlow.messages.noMessagesYet')}</p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-body-sm text-secondary font-medium">{item.status}</span>
                            <span className="text-xs text-outline">{item.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-ambient overflow-hidden flex flex-col min-h-0">
            {active ? (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between gap-4 bg-surface-container-lowest border-b border-outline-variant px-4 py-2 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold shrink-0">
                      {active.candidate?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-h3 text-primary truncate">{active.candidate}</p>
                      <p className="text-on-surface-variant text-sm truncate">{active.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 ${mutedConversations.includes(conversationKey(active)) ? 'border border-outline-variant bg-surface-container-high text-on-surface-variant' : 'bg-secondary text-on-secondary'} ${mutePulse === conversationKey(active) ? 'animate-scale-in' : ''}`} onClick={() => toggleMuteConversation(active)}>
                      <span className="material-symbols-outlined text-[18px]">{mutedConversations.includes(conversationKey(active)) ? 'notifications_off' : 'notifications_active'}</span>
                      {mutedConversations.includes(conversationKey(active)) ? t('companyFlow.messages.unmuteChat') : t('companyFlow.messages.muteChat')}
                    </button>
                  </div>
                </div>
                <div className="border-b border-outline-variant bg-surface-container-lowest px-4 py-1.5 shrink-0">
                  {scheduledInterview ? (
                    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-2 rounded-lg border px-3 py-1.5 ${scheduledInterview.includes('_passed') ? 'border-outline-variant bg-surface-container-low text-on-surface-variant' : 'border-secondary/30 bg-secondary/10'}`}>
                      <div className={`flex items-center gap-3 ${scheduledInterview.includes('_passed') ? 'text-on-surface-variant' : 'text-secondary'}`}>
                        <span className="material-symbols-outlined">{scheduledInterview.includes('_passed') ? 'history' : 'event_available'}</span>
                        <div>
                          <p className="font-semibold text-sm">{scheduledInterview.includes('_passed') ? t('companyFlow.messages.interviewPassedTitle') : t('companyFlow.messages.interviewScheduledTitle')}</p>
                          <p className="text-sm">{new Date(scheduledInterview.replace('_passed', '')).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                      <button className={`${scheduledInterview.includes('_passed') ? 'text-primary' : 'text-secondary'} font-semibold underline`} onClick={() => { setInterviewTime(scheduledInterview.includes('_passed') ? '' : scheduledInterview); setEditingInterview(true); }}>{scheduledInterview.includes('_passed') ? t('companyFlow.messages.reinterviewLink') : t('companyFlow.messages.rescheduleLink')}</button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-outline-variant px-3 py-1.5 text-on-surface-variant text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">event_busy</span>
                      {t('companyFlow.messages.noInterview')}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 bg-surface-container-lowest px-4 py-1.5 border-b border-outline-variant shrink-0 min-h-[52px]">
                  {(!scheduledInterview || editingInterview) && (
                    <>
                      {scheduledInterview && !editingInterview ? null : (
                        <>
                          <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 shadow-sm">
                            <span className="material-symbols-outlined text-[18px] text-secondary">event</span>
                            <input
                              className="bg-transparent text-sm outline-none text-primary min-w-[190px]"
                              type="datetime-local"
                              value={interviewTime}
                              onChange={(event) => setInterviewTime(event.target.value)}
                            />
                          </div>
                          <button className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 font-semibold text-sm transition-all duration-200 shadow-sm ${interviewTime ? 'bg-secondary text-on-secondary hover:-translate-y-0.5 hover:opacity-90' : 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-50'}`} disabled={!interviewTime} onClick={handleScheduleInterview}>
                            <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                            {scheduledInterview ? t('companyFlow.messages.reschedule') : t('companyFlow.messages.schedule')}
                          </button>
                          <button className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high" onClick={() => { setEditingInterview(false); setInterviewTime(''); }}>
                            {t('companyFlow.cancel')}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-4 bg-surface-container-low px-6 py-5 flex-1 overflow-y-auto min-h-0">
                  {messages.length === 0 ? <p className="text-on-surface-variant text-center font-body-sm italic mt-10">{t('companyFlow.messages.noMessagesInChat')}</p> :
                    messages.map((message, index) => {
                      const youLabel = t('companyFlow.messages.youLabel');
                      const mine = message.from === 'You' || message.from === youLabel;
                      return (
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`} key={`${active.id}-${message.id || index}`}>
                          <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${mine ? 'bg-secondary text-on-secondary rounded-tr-none' : 'bg-surface-container-lowest border border-outline-variant rounded-tl-none'}`}>
                            <p className={`font-label-sm text-xs mb-1 ${mine ? 'opacity-80' : 'text-on-surface-variant'}`}>{mine ? youLabel : message.from}</p>
                            <p className="font-body-md leading-relaxed">{message.text}</p>
                          </div>
                        </div>
                      );
                    })
                  }
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex gap-3 p-2.5 border-t border-outline-variant bg-surface-container-lowest shrink-0">
                  <input
                    className="flex-1 rounded-full border border-outline-variant bg-surface-container-low px-5 py-2.5 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 transition-all"
                    placeholder={t('companyFlow.messages.messagePlaceholder')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button className={`${buttonPrimary} rounded-full px-5`} onClick={handleSend} disabled={!newMessage.trim()}>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    {t('companyFlow.messages.send')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-12 text-on-surface-variant border-2 border-dashed border-outline-variant rounded-xl m-6">{t('companyFlow.messages.selectChatPlaceholder')}</div>
            )}
          </section>
        </div>
      </div>
      {contextMenu && (
        <div
          className="fixed bg-surface-container-lowest border border-outline-variant shadow-lg rounded-xl overflow-hidden z-[9999]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-start px-4 py-3 flex items-center gap-2 text-error hover:bg-error-container transition-colors"
            onClick={() => handleDeleteConversation(contextMenu.conversation)}
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            {t('companyFlow.messages.deleteChat')}
          </button>
        </div>
      )}

      <UndoToast target={undoTarget} onClear={() => setUndoTarget(null)} />
    </>
  );
}

export function CompanySettings() {
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

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

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
      await companyApi.verifyPassword(verifyInput);
      setUnlockState(prev => ({ ...prev, [verifyTarget]: true }));
      // Store the verified password to send with the final save request
      setSettings(prev => ({ ...prev, currentPassword: verifyInput }));
      setVerifyTarget(null);
    } catch (e) {
      setVerifyError(t('companyFlow.settings.incorrectPassword'));
    } finally {
      setVerifying(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!settings.name.trim()) next.name = t('companyFlow.settings.nameRequired');
    if (unlockState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) next.email = t('companyFlow.settings.emailInvalid');

    if (unlockState.password) {
      if (!settings.newPassword || settings.newPassword.length < 8) next.newPassword = t('companyFlow.settings.passwordMin');
      if (settings.newPassword !== settings.confirmPassword) next.confirmPassword = t('companyFlow.settings.passwordMatch');
    }

    setErrors(next);
    return !Object.keys(next).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await companyApi.updateSettings({
        name: settings.name,
        email: unlockState.email ? settings.email : undefined,
        currentPassword: settings.currentPassword || undefined,
        newPassword: unlockState.password ? settings.newPassword : undefined,
      });

      addToast({ title: t('companyFlow.settings.savedTitle'), message: t('companyFlow.settings.savedMessage'), type: 'success' });

      refreshUser();

      setSettings(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setUnlockState({ email: false, password: false });
    } catch (e) {
      addToast({ title: t('companyFlow.settings.updateFailedTitle'), message: e?.response?.data?.message || t('companyFlow.settings.updateFailedMessage'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderVerifyBlock = (targetName) => (
    <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm mt-2">
      <p className="font-h3 text-primary mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-secondary">lock</span>
        {t('companyFlow.settings.securityTitle')}
      </p>
      <p className="font-body-sm text-on-surface-variant mb-4">{t('companyFlow.settings.securityHint', { target: targetName })}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="password"
          className="flex-1 bg-surface border border-outline-variant rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
          placeholder={t('companyFlow.settings.currentPassword')}
          value={verifyInput}
          onChange={(e) => setVerifyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmVerify()}
        />
        <div className="flex gap-2">
          <button className={buttonSecondary} onClick={cancelVerify} disabled={verifying}>{t('companyFlow.cancel')}</button>
          <button className={buttonPrimary} onClick={confirmVerify} disabled={verifying || !verifyInput}>
            {verifying ? t('companyFlow.settings.verifying') : t('companyFlow.settings.unlock')}
          </button>
        </div>
      </div>
      {verifyError && <p className="font-body-sm text-error mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{verifyError}</p>}
    </div>
  );

  return (
    <>
      <CompanyPageHeader
        eyebrow={t('companyFlow.settings.eyebrow')}
        title={t('companyFlow.settings.title')}
        description={t('companyFlow.settings.description')}
      />
      <div className="flex flex-col gap-8">
        <Section title={t('companyFlow.settings.accountDetails')}>
          <div className="grid grid-cols-1 gap-6">
            <Field error={errors.name} label={t('companyFlow.settings.accountName')}>
              <TextInput onChange={(e) => update('name', e.target.value)} value={settings.name} disabled={saving} />
            </Field>

            <div>
              <span className="font-label-md text-label-md text-primary block mb-1">{t('companyFlow.settings.emailAddress')}</span>
              {!unlockState.email ? (
                verifyTarget === 'email' ? renderVerifyBlock(t('companyFlow.settings.emailAddress').toLowerCase()) : (
                  <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5">
                    <span className="text-on-surface-variant font-body-md truncate">{user?.email}</span>
                    <button onClick={() => startVerify('email')} className="text-secondary font-semibold text-sm hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">edit</span> {t('companyFlow.settings.change')}
                    </button>
                  </div>
                )
              ) : (
                <Field error={errors.email}>
                  <TextInput type="email" onChange={(e) => update('email', e.target.value)} value={settings.email} disabled={saving} />
                </Field>
              )}
            </div>

            <div>
              <span className="font-label-md text-label-md text-primary block mb-1">{t('companyFlow.settings.passwordLabel')}</span>
              {!unlockState.password ? (
                verifyTarget === 'password' ? renderVerifyBlock(t('companyFlow.settings.passwordLabel').toLowerCase()) : (
                  <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5">
                    <span className="text-on-surface-variant font-body-md tracking-[0.2em] mt-1">{t('companyFlow.settings.passwordMask')}</span>
                    <button onClick={() => startVerify('password')} className="text-secondary font-semibold text-sm hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">edit</span> {t('companyFlow.settings.change')}
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4 bg-surface-container-low p-6 rounded-xl border border-outline-variant shadow-sm">
                  <h4 className="font-h3 text-primary">{t('companyFlow.settings.newPasswordSection')}</h4>
                  <Field error={errors.newPassword} label={t('companyFlow.settings.newPasswordField')}>
                    <TextInput type="password" onChange={(e) => update('newPassword', e.target.value)} value={settings.newPassword} disabled={saving} />
                  </Field>
                  <Field error={errors.confirmPassword} label={t('companyFlow.settings.confirmField')}>
                    <TextInput type="password" onChange={(e) => update('confirmPassword', e.target.value)} value={settings.confirmPassword} disabled={saving} />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-outline-variant mt-2">
            <button className={buttonPrimary} onClick={save} disabled={saving}>
              <span className="material-symbols-outlined text-[20px]">save</span>
              {saving ? t('companyFlow.settings.saving') : t('companyFlow.settings.save')}
            </button>
          </div>
        </Section>
      </div>
    </>
  );
}
