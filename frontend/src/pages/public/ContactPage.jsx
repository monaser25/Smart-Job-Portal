import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../../utils/constants';
import { isValidEmail } from '../../utils/validation';
import { useToast } from '../../components/useToast';
import PublicNavBar from '../../components/PublicNavBar';
import PublicFooter from '../../components/PublicFooter';
import Reveal from '../../motion/Reveal';
import Stagger from '../../motion/Stagger';
import { getContactInfo } from '../../services/publicDataService';

const SUBJECT_OPTIONS = ['seeker', 'employer', 'technical', 'billing', 'other'];

export default function ContactPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', subject: 'seeker', message: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState({});

  useEffect(() => {
    let mounted = true;

    getContactInfo().then((loadedContactInfo) => {
      if (mounted) setContactInfo(loadedContactInfo || {});
    });

    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = t('contact.errors.nameRequired');
    if (!form.email.trim()) e.email = t('contact.errors.emailRequired');
    else if (!isValidEmail(form.email)) e.email = t('contact.errors.emailInvalid');
    if (!form.message.trim()) e.message = t('contact.errors.messageRequired');
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }));

  const showError = (field) => (touched[field] || Object.keys(errors).length > 0) && errors[field];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      setTouched({ fullName: true, email: true, message: true });
      return;
    }
    setLoading(true);
    try {
      // TODO: Pending backend endpoint confirmation (POST /contact)
      await new Promise((r) => setTimeout(r, 1500));
      addToast({ title: t('contact.toastSuccessTitle'), message: t('contact.toastSuccessMessage'), type: 'success' });
      setForm({ fullName: '', email: '', subject: 'seeker', message: '' });
      setTouched({});
      setErrors({});
    } catch {
      addToast({ title: t('contact.toastErrorTitle'), message: t('contact.toastErrorMessage'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const emailValue = contactInfo.email || t('contact.info.emailValue');
  const phoneValue = contactInfo.phone || t('contact.info.phoneValue');
  const locationValue = contactInfo.location || t('contact.info.locationLine1');

  return (
    <div className="stitch-page bg-background text-on-background font-body-md text-body-md min-h-screen flex flex-col">
      <div>
        <PublicNavBar />
        {/* Main Content */}
        <main className="flex-grow w-full max-w-container-max-width mx-auto px-margin-desktop py-stack-lg flex flex-col gap-stack-lg">
          {/* Hero Section */}
          <Reveal whenInView as="section" className="text-center py-stack-lg max-w-2xl mx-auto">
            <h1 className="font-h1 text-h1 text-primary mb-stack-md">{t('contact.heroTitle')}</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {t('contact.heroDescription')}
            </p>
          </Reveal>
          {/* Grid Layout */}
          <Stagger whenInView className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start" delayChildren={0.08} staggerChildren={0.08}>
            {/* Left Column: Form */}
            <Stagger.Item as="section" className="lg:col-span-7 bg-surface-container-lowest p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h2 className="font-h2 text-h2 text-primary mb-stack-md">{t('contact.formTitle')}</h2>
              <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row gap-gutter">
                  <div className="flex-1">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="fullName">{t('contact.nameLabel')}</label>
                    <input className={`w-full bg-surface-container-low border ${showError('fullName') ? 'border-error' : 'border-outline-variant'} rounded-lg px-stack-md py-stack-sm text-on-background focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow`} id="fullName" name="fullName" placeholder={t('contact.namePlaceholder')} type="text" value={form.fullName} onChange={handleChange} onBlur={handleBlur} />
                    {showError('fullName') && <p className="mt-unit font-body-md text-error text-sm">{errors.fullName}</p>}
                  </div>
                  <div className="flex-1">
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="email">{t('contact.emailLabel')}</label>
                    <input className={`w-full bg-surface-container-low border ${showError('email') ? 'border-error' : 'border-outline-variant'} rounded-lg px-stack-md py-stack-sm text-on-background focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow`} id="email" name="email" placeholder={t('contact.emailPlaceholder')} type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} />
                    {showError('email') && <p className="mt-unit font-body-md text-error text-sm">{errors.email}</p>}
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="subject">{t('contact.subjectLabel')}</label>
                  <select className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-stack-md py-stack-sm text-on-background focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow appearance-none" id="subject" name="subject" value={form.subject} onChange={handleChange}>
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{t(`contact.subjects.${opt}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="message">{t('contact.messageLabel')}</label>
                  <textarea className={`w-full bg-surface-container-low border ${showError('message') ? 'border-error' : 'border-outline-variant'} rounded-lg px-stack-md py-stack-sm text-on-background focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-shadow resize-y`} id="message" name="message" placeholder={t('contact.messagePlaceholder')} rows={5} value={form.message} onChange={handleChange} onBlur={handleBlur} />
                  {showError('message') && <p className="mt-unit font-body-md text-error text-sm">{errors.message}</p>}
                </div>
                <button
                  className={`mt-stack-sm self-start bg-secondary text-on-secondary font-h3 text-h3 font-semibold px-stack-lg py-stack-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-unit ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  type="submit" disabled={loading}
                >
                  {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                  <span>{loading ? t('contact.sending') : t('contact.sendMessage')}</span>
                  {!loading && <span className="material-symbols-outlined text-on-secondary" style={{ fontSize: 20 }}>send</span>}
                </button>
              </form>
            </Stagger.Item>
            {/* Right Column: Contact Info & FAQ */}
            <Stagger.Item as="section" className="lg:col-span-5 flex flex-col gap-gutter">
              <div className="bg-surface-container-lowest p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex flex-col gap-stack-md">
                <h3 className="font-h3 text-h3 text-primary mb-unit">{t('contact.info.title')}</h3>
                <div className="flex items-start gap-stack-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">mail</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-unit">{t('contact.info.emailLabel')}</p>
                    <a className="font-body-lg text-body-lg text-secondary hover:underline" href={`mailto:${emailValue}`}>{emailValue}</a>
                  </div>
                </div>
                <div className="flex items-start gap-stack-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">phone</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-unit">{t('contact.info.phoneLabel')}</p>
                    <p className="font-body-lg text-body-lg text-on-background" dir="ltr">{phoneValue}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-unit">{t('contact.info.phoneHours')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-stack-md">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary">location_on</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-unit">{t('contact.info.locationLabel')}</p>
                    <p className="font-body-lg text-body-lg text-on-background">{locationValue}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">{t('contact.info.locationLine2')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-stack-lg rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border-s-4 border-secondary">
                <div className="flex items-start gap-stack-md">
                  <span className="material-symbols-outlined text-secondary mt-1">help</span>
                  <div>
                    <h4 className="font-h3 text-h3 text-primary mb-unit">{t('contact.faqCard.title')}</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-stack-sm">{t('contact.faqCard.description')}</p>
                    <Link className="font-body-md text-body-md text-secondary font-semibold hover:underline flex items-center gap-unit" to={ROUTES.FAQ}>
                      {t('contact.faqCard.browseFaq')}
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </Stagger.Item>
          </Stagger>
        </main>
        <PublicFooter />
      </div>
    </div>
  );
}
