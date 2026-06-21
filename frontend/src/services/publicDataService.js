import { jobsService } from '../api/jobsService';
import { companyService } from '../api/companyService';
import { apiRequest } from '../api/httpClient';

const toPositiveNumber = (value) => {
  const number = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parseSalaryRange = (salaryRange) => {
  const source = String(salaryRange || '');
  const values = source.match(/\d[\d,.]*\s*k?/gi)?.map((item) => {
    const number = Number(item.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(number) || number <= 0) return null;
    return /k/i.test(item) ? number * 1000 : number;
  }).filter(Boolean) || [];
  const currency = source.includes('$') ? '$' : source.replace(/\d[\d,.]*\s*k?|[\s\-–]/gi, '').trim() || 'USD';

  return {
    salaryMin: values[0] || null,
    salaryMax: values[1] || null,
    currency,
  };
};

const splitTextList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(/\r?\n|•|-/).map((item) => item.trim()).filter(Boolean);
};

export const normalizePublicJob = (job = {}) => {
  const company = job.company_profile || job.companyProfile || (typeof job.company === 'object' ? job.company : {}) || {};
  const requiredSkillRows = job.job_required_skills || job.jobRequiredSkills || [];
  const requiredSkills = requiredSkillRows.map((row) => (typeof row === 'string' ? row : row.skill?.name || row.skill_name || row.name)).filter(Boolean);
  const parsedSalary = parseSalaryRange(job.salary_range || job.salaryRange || job.salary);
  const salaryMin = toPositiveNumber(job.salary_min ?? job.salaryMin) || parsedSalary.salaryMin;
  const salaryMax = toPositiveNumber(job.salary_max ?? job.salaryMax) || parsedSalary.salaryMax;
  const hasSalary = Boolean(salaryMin || salaryMax);

  return {
    id: job.id,
    title: job.title || 'Untitled job',
    category: job.category || 'Other',
    company: company.company_name || company.name || (typeof job.company === 'string' ? job.company : 'Company'),
    companyId: company.id || job.company_profile_id || job.companyProfileId || job.company_id || job.companyId || null,
    companyLogo: company.logo_url || company.logo || '',
    location: job.location || company.location || 'Remote',
    type: job.job_type || job.type || 'full_time',
    workMode: job.work_mode || job.workMode || (job.job_type === 'remote' ? 'Remote' : 'On-site'),
    description: job.description || '',
    responsibilities: splitTextList(job.responsibilities),
    requirements: splitTextList(job.requirements),
    requiredSkills,
    postedAt: job.created_at || job.postedAt || new Date().toISOString(),
    status: job.status || (job.is_active === false ? 'paused' : 'active'),
    matchScore: job.ai_score ? Number(job.ai_score) : undefined,
    applicationsCount: job.applications_count || job.applicationsCount || 0,
    salary: hasSalary ? job.salary_range || job.salaryRange || job.salary || '' : '',
    salaryMin,
    salaryMax,
    currency: parsedSalary.currency,
    experienceLevel: job.experience_level || job.experienceLevel || '',
    education: job.education || '',
    tags: requiredSkills,
    posted: new Date(job.created_at || new Date()).toLocaleDateString(),
    companyInfo: {
      description: company.description || '',
      website: company.website || '',
      employees: company.employees || '',
    },
  };
};

export const normalizePublicCompany = (company = {}) => {
  return {
    id: company.id,
    name: company.company_name || company.name || 'Company',
    logo: company.logo_url || company.logo || '',
    industry: company.industry || 'Technology',
    location: company.location || 'Remote',
    description: company.description || '',
    website: company.website || '',
    employees: company.employees || '',
    openPositions: company.active_jobs_count || company.jobs_count || company.openPositions || 0,
    rating: company.rating || 0,
    reviewCount: company.reviewCount || 0,
    benefits: splitTextList(company.benefits),
  };
};

export const getPublicJobs = async (filters = {}) => {
  const data = await jobsService.listPublicJobs(filters);
  const items = Array.isArray(data) ? data : (data?.data || []);
  return items.map(normalizePublicJob);
};

export const getPublicJobById = async (id) => {
  const data = await jobsService.getPublicJob(id);
  return normalizePublicJob(data);
};

export const getPublicCompanies = async (filters = {}) => {
  const data = await companyService.listPublicCompanies(filters);
  const items = Array.isArray(data) ? data : (data?.data || []);
  return items.map(normalizePublicCompany);
};

export const getContactInfo = async () => {
  try {
    const response = await apiRequest('/public/contact-info');
    return response?.data ?? response ?? {};
  } catch {
    return {};
  }
};

export const getPublicCompanyById = async (id) => {
  const response = await companyService.getPublicCompany(id);
  // Safely extract the nested payload from Laravel's ApiResponse format
  let payload = response;
  
  // Unwrap nested `data` properties safely until we hit the actual object with `company` or primitive fallback.
  while (payload && typeof payload === 'object' && !Array.isArray(payload) && ('data' in payload)) {
     if (payload.company !== undefined) {
         break; // Found the target payload directly inside
     }
     payload = payload.data;
  }

  if (payload?.company) {
    const company = normalizePublicCompany(payload.company);
    const activeJobs = Array.isArray(payload.active_jobs) ? payload.active_jobs : (payload.active_jobs?.data || []);

    return {
      company,
      activeJobs: activeJobs.map((job) => normalizePublicJob({
        ...job,
        company_profile: job.company_profile || payload.company,
      }))
    };
  }
  
  // Fallback if company wrapper doesn't exist
  return { company: normalizePublicCompany(payload), activeJobs: [] };
};
