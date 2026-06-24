<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicationStatusHistory;
use App\Models\CompanyProfile;
use App\Models\CvParsedData;
use App\Models\JobPost;
use App\Models\JobRequiredSkill;
use App\Models\JobSeekerProfile;
use App\Models\JobSeekerSkill;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDataSeeder extends Seeder
{
    private const PASSWORD = 'password123';

    public function run(): void
    {
        DB::transaction(function () {
            $this->clearExistingJobData();
            $skills = $this->skillsByName();
            $admin = $this->createAdmin();
            $companies = $this->createCompanies();
            $seekers = $this->createJobSeekers($skills);
            $jobs = $this->createJobs($companies, $skills);

            $this->createApplications($admin, $companies, $seekers, $jobs);
            $this->createMessagesAndInterviewNotifications($companies, $seekers, $jobs);
            $this->createSavedJobs($seekers, $jobs);
        });
    }

    private function clearExistingJobData(): void
    {
        ApplicationStatusHistory::query()->delete();
        Application::withTrashed()->forceDelete();
        Message::query()->delete();
        Notification::query()->delete();
        DB::table('saved_jobs')->delete();
        JobRequiredSkill::query()->delete();
        JobPost::withTrashed()->forceDelete();

        $demoEmails = array_merge(
            ['admin@test.com'],
            array_column($this->companyUsers(), 'email'),
            array_column($this->jobSeekerUsers(), 'email'),
        );

        $demoUserIds = User::withTrashed()->whereIn('email', $demoEmails)->pluck('id');
        $demoSeekerIds = JobSeekerProfile::whereIn('user_id', $demoUserIds)->pluck('id');

        CvParsedData::whereIn('job_seeker_id', $demoSeekerIds)->delete();
        JobSeekerSkill::whereIn('job_seeker_id', $demoSeekerIds)->delete();
        JobSeekerProfile::whereIn('user_id', $demoUserIds)->delete();
        CompanyProfile::whereIn('user_id', $demoUserIds)->delete();
        User::withTrashed()->whereIn('email', $demoEmails)->forceDelete();
    }

    private function skillsByName(): array
    {
        return Skill::query()->pluck('id', 'name')->all();
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Demo Admin',
            'email' => 'admin@test.com',
            'password' => self::PASSWORD,
            'role' => 'admin',
            'email_verified_at' => now(),
            'is_banned' => false,
        ]);
    }

    private function createCompanies(): array
    {
        $companies = [];

        foreach ($this->companyUsers() as $data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => self::PASSWORD,
                'role' => 'company',
                'email_verified_at' => now(),
                'is_banned' => false,
            ]);

            $companies[$data['key']] = CompanyProfile::create([
                'user_id' => $user->id,
                'company_name' => $data['company_name'],
                'description' => $data['description'],
                'logo_url' => $data['logo_url'],
                'website' => $data['website'],
                'location' => $data['location'],
                'phone' => $data['phone'],
                'founded_year' => $data['founded_year'],
                'company_size' => $data['company_size'],
                'industry' => $data['industry'],
            ])->load('user');
        }

        return $companies;
    }

    private function createJobSeekers(array $skills): array
    {
        $seekers = [];

        foreach ($this->jobSeekerUsers() as $data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => self::PASSWORD,
                'role' => 'job_seeker',
                'email_verified_at' => now(),
                'is_banned' => false,
            ]);

            $profile = JobSeekerProfile::create([
                'user_id' => $user->id,
                'resume_file_url' => $data['resume_file_url'],
                'years_of_experience' => $data['years_of_experience'],
                'education_level' => $data['education_level'],
                'contact_information' => json_encode($data['contact_information']),
                'cv_parse_status' => 'done',
                'phone' => $data['phone'],
                'address' => $data['address'],
            ])->load('user');

            foreach ($data['skills'] as $skillName) {
                if (isset($skills[$skillName])) {
                    JobSeekerSkill::create([
                        'job_seeker_id' => $profile->id,
                        'skill_id' => $skills[$skillName],
                        'source' => 'manual',
                    ]);
                }
            }

            CvParsedData::create([
                'job_seeker_id' => $profile->id,
                'parsed_json' => [
                    'summary' => $data['summary'],
                    'skills' => $data['skills'],
                    'experience_years' => $data['years_of_experience'],
                    'education' => $data['education_level'],
                ],
                'parsed_at' => now()->subDays(2),
            ]);

            $seekers[$data['key']] = $profile;
        }

        return $seekers;
    }

    private function createJobs(array $companies, array $skills): array
    {
        $jobs = [];

        foreach ($this->jobPosts() as $data) {
            $job = JobPost::create([
                'company_id' => $companies[$data['company_key']]->id,
                'title' => $data['title'],
                'category' => $data['category'],
                'description' => $data['description'],
                'responsibilities' => $data['responsibilities'],
                'location' => $data['location'],
                'work_mode' => $data['work_mode'],
                'job_type' => $data['job_type'],
                'salary_range' => $data['salary_range'],
                'salary_min' => $data['salary_min'],
                'salary_max' => $data['salary_max'],
                'experience_level' => $data['experience_level'],
                'education' => $data['education'],
                'status' => $data['status'],
                'views' => $data['views'],
                'is_active' => $data['is_active'],
            ]);

            foreach ($data['skills'] as $index => $skillName) {
                if (isset($skills[$skillName])) {
                    JobRequiredSkill::create([
                        'job_id' => $job->id,
                        'skill_id' => $skills[$skillName],
                        'is_mandatory' => $index < 3,
                    ]);
                }
            }

            $jobs[$data['key']] = $job;
        }

        return $jobs;
    }

    private function createApplications(User $admin, array $companies, array $seekers, array $jobs): void
    {
        foreach ($this->applications() as $data) {
            $application = Application::create([
                'job_id' => $jobs[$data['job_key']]->id,
                'job_seeker_id' => $seekers[$data['seeker_key']]->id,
                'ai_score' => $data['ai_score'],
                'missing_skills_json' => $data['missing_skills'],
                'status' => $data['status'],
            ]);

            ApplicationStatusHistory::create([
                'application_id' => $application->id,
                'status' => 'applied',
                'changed_by' => $admin->id,
                'notes' => 'Demo application created for testing.',
                'created_at' => now()->subDays(5),
            ]);

            if ($data['status'] !== 'applied') {
                ApplicationStatusHistory::create([
                    'application_id' => $application->id,
                    'status' => $data['status'],
                    'changed_by' => $companies[$data['company_key']]->user_id,
                    'notes' => $data['history_note'],
                    'created_at' => now()->subDays(2),
                ]);
            }
        }
    }

    private function createMessagesAndInterviewNotifications(array $companies, array $seekers, array $jobs): void
    {
        foreach ($this->messageThreads() as $thread) {
            $companyUser = $companies[$thread['company_key']]->user;
            $seekerUser = $seekers[$thread['seeker_key']]->user;
            $job = $jobs[$thread['job_key']];

            foreach ($thread['messages'] as $index => $message) {
                Message::create([
                    'sender_id' => $message['from'] === 'company' ? $companyUser->id : $seekerUser->id,
                    'receiver_id' => $message['from'] === 'company' ? $seekerUser->id : $companyUser->id,
                    'job_id' => $job->id,
                    'content' => $message['content'],
                    'read_at' => $index === count($thread['messages']) - 1 ? null : now()->subHours(6),
                    'created_at' => now()->subHours(12 - $index),
                    'updated_at' => now()->subHours(12 - $index),
                ]);
            }

            if (isset($thread['interview_at'])) {
                Notification::create([
                    'user_id' => $seekerUser->id,
                    'type' => 'interview_scheduled',
                    'data' => [
                        'title' => 'Interview scheduled with ' . $companies[$thread['company_key']]->company_name,
                        'message' => 'Interview for ' . $job->title . ' on ' . $thread['interview_at'] . '.',
                        'message_preview' => 'Interview scheduled for ' . $job->title,
                        'sender_id' => $companyUser->id,
                        'sender_name' => $companies[$thread['company_key']]->company_name,
                        'company_name' => $companies[$thread['company_key']]->company_name,
                        'job_id' => $job->id,
                        'job_title' => $job->title,
                        'interview_at' => $thread['interview_at'],
                    ],
                    'created_at' => now()->subHours(2),
                ]);
            }
        }
    }

    private function createSavedJobs(array $seekers, array $jobs): void
    {
        DB::table('saved_jobs')->insert([
            ['job_seeker_id' => $seekers['nour']->id, 'job_id' => $jobs['laravel']->id, 'created_at' => now(), 'updated_at' => now()],
            ['job_seeker_id' => $seekers['omar']->id, 'job_id' => $jobs['react']->id, 'created_at' => now(), 'updated_at' => now()],
            ['job_seeker_id' => $seekers['salma']->id, 'job_id' => $jobs['data']->id, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Builds a clean square initials-logo URL (renders nicely as a company logo).
     */
    private function logo(string $name, string $color): string
    {
        return 'https://ui-avatars.com/api/?name=' . rawurlencode($name)
            . '&background=' . $color . '&color=ffffff&bold=true&size=160&format=png';
    }

    private function companyUsers(): array
    {
        return [
            [
                'key' => 'techlabs',
                'name' => 'TechLabs Recruiter',
                'email' => 'company.techlabs@test.com',
                'company_name' => 'TechLabs Egypt',
                'description' => 'Product engineering company building SaaS platforms for regional clients.',
                'logo_url' => $this->logo('TechLabs Egypt', '2563eb'),
                'website' => 'https://techlabs.test',
                'location' => 'Cairo, Egypt',
                'phone' => '+201000000101',
                'founded_year' => '2018',
                'company_size' => '51-200',
                'industry' => 'Software Development',
            ],
            [
                'key' => 'nilecommerce',
                'name' => 'Nile Commerce HR',
                'email' => 'company.nile@test.com',
                'company_name' => 'Nile Commerce',
                'description' => 'E-commerce marketplace focused on retail, payments, and logistics.',
                'logo_url' => $this->logo('Nile Commerce', 'f97316'),
                'website' => 'https://nilecommerce.test',
                'location' => 'Alexandria, Egypt',
                'phone' => '+201000000202',
                'founded_year' => '2020',
                'company_size' => '201-500',
                'industry' => 'E-Commerce',
            ],
            [
                'key' => 'datavision',
                'name' => 'DataVision Talent',
                'email' => 'company.datavision@test.com',
                'company_name' => 'DataVision Analytics',
                'description' => 'Analytics consultancy helping companies turn operational data into decisions.',
                'logo_url' => $this->logo('DataVision Analytics', '7c3aed'),
                'website' => 'https://datavision.test',
                'location' => 'Giza, Egypt',
                'phone' => '+201000000303',
                'founded_year' => '2016',
                'company_size' => '11-50',
                'industry' => 'Data Analytics',
            ],
            [
                'key' => 'cloudpeak',
                'name' => 'CloudPeak HR',
                'email' => 'company.cloudpeak@test.com',
                'company_name' => 'CloudPeak Systems',
                'description' => 'Cloud infrastructure and DevOps partner running mission-critical workloads on AWS and Azure.',
                'logo_url' => $this->logo('CloudPeak Systems', '0ea5e9'),
                'website' => 'https://cloudpeak.test',
                'location' => 'Cairo, Egypt',
                'phone' => '+201000000404',
                'founded_year' => '2019',
                'company_size' => '51-200',
                'industry' => 'Cloud & Infrastructure',
            ],
            [
                'key' => 'fintrust',
                'name' => 'FinTrust Talent',
                'email' => 'company.fintrust@test.com',
                'company_name' => 'FinTrust Solutions',
                'description' => 'FinTech company delivering digital payments, wallets, and lending products.',
                'logo_url' => $this->logo('FinTrust Solutions', '059669'),
                'website' => 'https://fintrust.test',
                'location' => 'Cairo, Egypt',
                'phone' => '+201000000505',
                'founded_year' => '2021',
                'company_size' => '201-500',
                'industry' => 'FinTech',
            ],
            [
                'key' => 'medicare',
                'name' => 'MediCare Recruiting',
                'email' => 'company.medicare@test.com',
                'company_name' => 'MediCare Plus',
                'description' => 'HealthTech platform connecting patients, clinics, and pharmacies across the region.',
                'logo_url' => $this->logo('MediCare Plus', 'e11d48'),
                'website' => 'https://medicare.test',
                'location' => 'Alexandria, Egypt',
                'phone' => '+201000000606',
                'founded_year' => '2020',
                'company_size' => '51-200',
                'industry' => 'HealthTech',
            ],
            [
                'key' => 'edunova',
                'name' => 'EduNova HR',
                'email' => 'company.edunova@test.com',
                'company_name' => 'EduNova',
                'description' => 'EdTech startup building interactive learning and assessment tools for schools.',
                'logo_url' => $this->logo('EduNova', 'd946ef'),
                'website' => 'https://edunova.test',
                'location' => 'Giza, Egypt',
                'phone' => '+201000000707',
                'founded_year' => '2022',
                'company_size' => '11-50',
                'industry' => 'EdTech',
            ],
            [
                'key' => 'brightmedia',
                'name' => 'BrightMedia Talent',
                'email' => 'company.brightmedia@test.com',
                'company_name' => 'BrightMedia',
                'description' => 'Digital marketing and media agency producing campaigns and web experiences.',
                'logo_url' => $this->logo('BrightMedia', 'd97706'),
                'website' => 'https://brightmedia.test',
                'location' => 'Cairo, Egypt',
                'phone' => '+201000000808',
                'founded_year' => '2017',
                'company_size' => '11-50',
                'industry' => 'Marketing & Media',
            ],
            [
                'key' => 'greenenergy',
                'name' => 'GreenEnergy HR',
                'email' => 'company.greenenergy@test.com',
                'company_name' => 'GreenEnergy Co',
                'description' => 'Renewable energy company building solar and smart-grid monitoring solutions.',
                'logo_url' => $this->logo('GreenEnergy Co', '16a34a'),
                'website' => 'https://greenenergy.test',
                'location' => 'Aswan, Egypt',
                'phone' => '+201000000909',
                'founded_year' => '2015',
                'company_size' => '201-500',
                'industry' => 'Renewable Energy',
            ],
            [
                'key' => 'securenet',
                'name' => 'SecureNet Recruiting',
                'email' => 'company.securenet@test.com',
                'company_name' => 'SecureNet',
                'description' => 'Cybersecurity firm providing threat monitoring, audits, and secure infrastructure.',
                'logo_url' => $this->logo('SecureNet', '334155'),
                'website' => 'https://securenet.test',
                'location' => 'Cairo, Egypt',
                'phone' => '+201000001010',
                'founded_year' => '2014',
                'company_size' => '51-200',
                'industry' => 'Cybersecurity',
            ],
        ];
    }

    private function jobSeekerUsers(): array
    {
        return [
            [
                'key' => 'nour',
                'name' => 'Nour Hassan',
                'email' => 'seeker.nour@test.com',
                'resume_file_url' => '/demo/cvs/nour-hassan.pdf',
                'years_of_experience' => 3,
                'education_level' => 'Bachelor of Computer Science',
                'phone' => '+201111111111',
                'address' => 'Nasr City, Cairo',
                'summary' => 'Backend developer with Laravel and API experience.',
                'skills' => ['PHP', 'Laravel', 'MySQL', 'REST API', 'Git', 'Docker'],
                'contact_information' => ['firstName' => 'Nour', 'lastName' => 'Hassan', 'title' => 'Laravel Developer'],
            ],
            [
                'key' => 'omar',
                'name' => 'Omar Adel',
                'email' => 'seeker.omar@test.com',
                'resume_file_url' => '/demo/cvs/omar-adel.pdf',
                'years_of_experience' => 2,
                'education_level' => 'Bachelor of Information Systems',
                'phone' => '+201222222222',
                'address' => 'Maadi, Cairo',
                'summary' => 'Frontend developer focused on React and TypeScript.',
                'skills' => ['JavaScript', 'TypeScript', 'React', 'Tailwind CSS', 'REST API', 'Git'],
                'contact_information' => ['firstName' => 'Omar', 'lastName' => 'Adel', 'title' => 'Frontend Developer'],
            ],
            [
                'key' => 'salma',
                'name' => 'Salma Mostafa',
                'email' => 'seeker.salma@test.com',
                'resume_file_url' => '/demo/cvs/salma-mostafa.pdf',
                'years_of_experience' => 4,
                'education_level' => 'Bachelor of Statistics',
                'phone' => '+201333333333',
                'address' => 'Dokki, Giza',
                'summary' => 'Data analyst with Python, SQL, and dashboarding experience.',
                'skills' => ['Python', 'PostgreSQL', 'MySQL', 'Communication', 'Problem Solving', 'Presentation Skills'],
                'contact_information' => ['firstName' => 'Salma', 'lastName' => 'Mostafa', 'title' => 'Data Analyst'],
            ],
            [
                'key' => 'youssef',
                'name' => 'Youssef Ali',
                'email' => 'seeker.youssef@test.com',
                'resume_file_url' => '/demo/cvs/youssef-ali.pdf',
                'years_of_experience' => 1,
                'education_level' => 'Bachelor of Business Information Systems',
                'phone' => '+201444444444',
                'address' => 'Mansoura, Egypt',
                'summary' => 'Junior QA tester learning automation and CI/CD workflows.',
                'skills' => ['JavaScript', 'Git', 'TDD', 'Communication', 'Attention to Detail'],
                'contact_information' => ['firstName' => 'Youssef', 'lastName' => 'Ali', 'title' => 'Junior QA Tester'],
            ],
        ];
    }

    private function jobPosts(): array
    {
        return [
            [
                'key' => 'laravel',
                'company_key' => 'techlabs',
                'title' => 'Laravel Backend Developer',
                'category' => 'Backend Development',
                'description' => 'Build APIs, queues, and integrations for a growing SaaS platform.',
                'responsibilities' => 'Develop REST APIs, optimize MySQL queries, write tests, and review pull requests.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'full_time',
                'salary_range' => '18000 - 28000 EGP',
                'salary_min' => 18000,
                'salary_max' => 28000,
                'experience_level' => 'Mid Level',
                'education' => 'Bachelor degree preferred',
                'status' => 'active',
                'views' => 43,
                'is_active' => true,
                'skills' => ['PHP', 'Laravel', 'MySQL', 'REST API', 'Git', 'Docker'],
            ],
            [
                'key' => 'react',
                'company_key' => 'nilecommerce',
                'title' => 'React Frontend Engineer',
                'category' => 'Frontend Development',
                'description' => 'Create fast dashboards and storefront experiences for marketplace teams.',
                'responsibilities' => 'Build React components, integrate APIs, improve UX, and support responsive layouts.',
                'location' => 'Remote',
                'work_mode' => 'Remote',
                'job_type' => 'remote',
                'salary_range' => '16000 - 26000 EGP',
                'salary_min' => 16000,
                'salary_max' => 26000,
                'experience_level' => 'Junior to Mid Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 61,
                'is_active' => true,
                'skills' => ['JavaScript', 'TypeScript', 'React', 'Tailwind CSS', 'REST API', 'Git'],
            ],
            [
                'key' => 'data',
                'company_key' => 'datavision',
                'title' => 'Data Analyst',
                'category' => 'Data',
                'description' => 'Analyze business data and create reports for product and operations teams.',
                'responsibilities' => 'Write SQL queries, clean datasets, prepare dashboards, and present insights.',
                'location' => 'Giza, Egypt',
                'work_mode' => 'On-site',
                'job_type' => 'full_time',
                'salary_range' => '14000 - 22000 EGP',
                'salary_min' => 14000,
                'salary_max' => 22000,
                'experience_level' => 'Mid Level',
                'education' => 'Statistics, Computer Science, or similar',
                'status' => 'active',
                'views' => 29,
                'is_active' => true,
                'skills' => ['Python', 'PostgreSQL', 'MySQL', 'Problem Solving', 'Presentation Skills'],
            ],
            [
                'key' => 'qa',
                'company_key' => 'techlabs',
                'title' => 'QA Automation Intern',
                'category' => 'Quality Assurance',
                'description' => 'Join the QA team to test web applications and learn automation workflows.',
                'responsibilities' => 'Create test cases, report bugs, help maintain automated test suites.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'On-site',
                'job_type' => 'internship',
                'salary_range' => '4000 - 6000 EGP',
                'salary_min' => 4000,
                'salary_max' => 6000,
                'experience_level' => 'Entry Level',
                'education' => 'Student or fresh graduate',
                'status' => 'active',
                'views' => 18,
                'is_active' => true,
                'skills' => ['JavaScript', 'Git', 'TDD', 'Attention to Detail', 'Communication'],
            ],
            [
                'key' => 'devops',
                'company_key' => 'nilecommerce',
                'title' => 'DevOps Engineer',
                'category' => 'Infrastructure',
                'description' => 'Support deployment pipelines, cloud infrastructure, and monitoring.',
                'responsibilities' => 'Maintain Docker images, CI/CD pipelines, Linux servers, and cloud resources.',
                'location' => 'Alexandria, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'contract',
                'salary_range' => '25000 - 38000 EGP',
                'salary_min' => 25000,
                'salary_max' => 38000,
                'experience_level' => 'Senior Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 35,
                'is_active' => true,
                'skills' => ['Docker', 'Kubernetes', 'AWS', 'Linux', 'CI/CD', 'Nginx'],
            ],
            [
                'key' => 'fullstack',
                'company_key' => 'techlabs',
                'title' => 'Full Stack Developer',
                'category' => 'Full Stack Development',
                'description' => 'Own features end to end across a Laravel API and a React frontend.',
                'responsibilities' => 'Design APIs, build React UIs, write tests, and ship features to production.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'full_time',
                'salary_range' => '20000 - 32000 EGP',
                'salary_min' => 20000,
                'salary_max' => 32000,
                'experience_level' => 'Mid to Senior Level',
                'education' => 'Bachelor degree preferred',
                'status' => 'active',
                'views' => 52,
                'is_active' => true,
                'skills' => ['PHP', 'Laravel', 'React', 'TypeScript', 'MySQL', 'REST API'],
            ],
            [
                'key' => 'datascientist',
                'company_key' => 'datavision',
                'title' => 'Senior Data Scientist',
                'category' => 'Data',
                'description' => 'Build predictive models and recommendation systems for enterprise clients.',
                'responsibilities' => 'Develop ML models, run experiments, and communicate insights to stakeholders.',
                'location' => 'Giza, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'full_time',
                'salary_range' => '30000 - 48000 EGP',
                'salary_min' => 30000,
                'salary_max' => 48000,
                'experience_level' => 'Senior Level',
                'education' => 'MSc in Data Science, Statistics, or related',
                'status' => 'active',
                'views' => 47,
                'is_active' => true,
                'skills' => ['Python', 'PostgreSQL', 'Problem Solving', 'Critical Thinking', 'Presentation Skills'],
            ],
            [
                'key' => 'cloudeng',
                'company_key' => 'cloudpeak',
                'title' => 'Cloud Engineer',
                'category' => 'Infrastructure',
                'description' => 'Design and operate scalable cloud infrastructure on AWS and Azure.',
                'responsibilities' => 'Provision infrastructure as code, manage Kubernetes clusters, and optimize costs.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'Remote',
                'job_type' => 'full_time',
                'salary_range' => '28000 - 42000 EGP',
                'salary_min' => 28000,
                'salary_max' => 42000,
                'experience_level' => 'Senior Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 38,
                'is_active' => true,
                'skills' => ['AWS', 'Azure', 'Kubernetes', 'Docker', 'Linux', 'CI/CD'],
            ],
            [
                'key' => 'sre',
                'company_key' => 'cloudpeak',
                'title' => 'Site Reliability Engineer',
                'category' => 'Infrastructure',
                'description' => 'Keep production systems reliable, observable, and fast.',
                'responsibilities' => 'Build monitoring, define SLOs, automate incident response, and reduce toil.',
                'location' => 'Remote',
                'work_mode' => 'Remote',
                'job_type' => 'remote',
                'salary_range' => '26000 - 40000 EGP',
                'salary_min' => 26000,
                'salary_max' => 40000,
                'experience_level' => 'Mid to Senior Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 31,
                'is_active' => true,
                'skills' => ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'Nginx', 'Problem Solving'],
            ],
            [
                'key' => 'finbackend',
                'company_key' => 'fintrust',
                'title' => 'Backend Engineer (FinTech)',
                'category' => 'Backend Development',
                'description' => 'Build secure, high-throughput payment and wallet services.',
                'responsibilities' => 'Develop APIs, ensure data integrity, and integrate with banking partners.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'On-site',
                'job_type' => 'full_time',
                'salary_range' => '24000 - 38000 EGP',
                'salary_min' => 24000,
                'salary_max' => 38000,
                'experience_level' => 'Mid to Senior Level',
                'education' => 'Bachelor degree preferred',
                'status' => 'active',
                'views' => 44,
                'is_active' => true,
                'skills' => ['Node.js', 'PostgreSQL', 'Redis', 'REST API', 'Docker', 'Git'],
            ],
            [
                'key' => 'finmobile',
                'company_key' => 'fintrust',
                'title' => 'Mobile Developer',
                'category' => 'Mobile Development',
                'description' => 'Build and maintain the customer-facing mobile wallet app.',
                'responsibilities' => 'Develop mobile features, integrate APIs, and improve app performance.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'full_time',
                'salary_range' => '20000 - 34000 EGP',
                'salary_min' => 20000,
                'salary_max' => 34000,
                'experience_level' => 'Mid Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 27,
                'is_active' => true,
                'skills' => ['JavaScript', 'TypeScript', 'React', 'REST API', 'Git'],
            ],
            [
                'key' => 'healthfrontend',
                'company_key' => 'medicare',
                'title' => 'Frontend Developer (HealthTech)',
                'category' => 'Frontend Development',
                'description' => 'Build accessible patient and clinic dashboards.',
                'responsibilities' => 'Develop responsive React UIs and ensure accessibility and performance.',
                'location' => 'Alexandria, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'full_time',
                'salary_range' => '17000 - 28000 EGP',
                'salary_min' => 17000,
                'salary_max' => 28000,
                'experience_level' => 'Junior to Mid Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 33,
                'is_active' => true,
                'skills' => ['JavaScript', 'React', 'Tailwind CSS', 'REST API', 'Attention to Detail'],
            ],
            [
                'key' => 'eduengineer',
                'company_key' => 'edunova',
                'title' => 'Full Stack Engineer',
                'category' => 'Full Stack Development',
                'description' => 'Build interactive learning tools used by thousands of students.',
                'responsibilities' => 'Develop features across Vue.js and Node.js, and ship to production weekly.',
                'location' => 'Giza, Egypt',
                'work_mode' => 'Remote',
                'job_type' => 'remote',
                'salary_range' => '18000 - 30000 EGP',
                'salary_min' => 18000,
                'salary_max' => 30000,
                'experience_level' => 'Mid Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 40,
                'is_active' => true,
                'skills' => ['Vue.js', 'Node.js', 'MongoDB', 'REST API', 'Tailwind CSS', 'Git'],
            ],
            [
                'key' => 'webdev',
                'company_key' => 'brightmedia',
                'title' => 'Frontend Web Developer',
                'category' => 'Frontend Development',
                'description' => 'Build fast, polished landing pages and campaign microsites.',
                'responsibilities' => 'Develop responsive pages, optimize performance, and collaborate with designers.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'On-site',
                'job_type' => 'part_time',
                'salary_range' => '10000 - 16000 EGP',
                'salary_min' => 10000,
                'salary_max' => 16000,
                'experience_level' => 'Junior Level',
                'education' => 'Portfolio required',
                'status' => 'active',
                'views' => 22,
                'is_active' => true,
                'skills' => ['JavaScript', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'Creativity'],
            ],
            [
                'key' => 'iotengineer',
                'company_key' => 'greenenergy',
                'title' => 'IoT Software Engineer',
                'category' => 'Backend Development',
                'description' => 'Build software that monitors solar installations and smart-grid devices.',
                'responsibilities' => 'Develop data pipelines, device APIs, and real-time monitoring dashboards.',
                'location' => 'Aswan, Egypt',
                'work_mode' => 'Hybrid',
                'job_type' => 'full_time',
                'salary_range' => '22000 - 36000 EGP',
                'salary_min' => 22000,
                'salary_max' => 36000,
                'experience_level' => 'Mid Level',
                'education' => 'Bachelor degree preferred',
                'status' => 'active',
                'views' => 19,
                'is_active' => true,
                'skills' => ['Python', 'PostgreSQL', 'Redis', 'Linux', 'REST API', 'Problem Solving'],
            ],
            [
                'key' => 'securityeng',
                'company_key' => 'securenet',
                'title' => 'Security Engineer',
                'category' => 'Security',
                'description' => 'Harden infrastructure and lead security reviews across products.',
                'responsibilities' => 'Run audits, fix vulnerabilities, and build secure CI/CD pipelines.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'On-site',
                'job_type' => 'full_time',
                'salary_range' => '28000 - 45000 EGP',
                'salary_min' => 28000,
                'salary_max' => 45000,
                'experience_level' => 'Senior Level',
                'education' => 'Bachelor degree preferred',
                'status' => 'active',
                'views' => 30,
                'is_active' => true,
                'skills' => ['Linux', 'Docker', 'CI/CD', 'Problem Solving', 'Critical Thinking'],
            ],
            [
                'key' => 'socanalyst',
                'company_key' => 'securenet',
                'title' => 'SOC Analyst',
                'category' => 'Security',
                'description' => 'Monitor security events and respond to incidents around the clock.',
                'responsibilities' => 'Triage alerts, investigate incidents, and document response playbooks.',
                'location' => 'Cairo, Egypt',
                'work_mode' => 'On-site',
                'job_type' => 'full_time',
                'salary_range' => '15000 - 24000 EGP',
                'salary_min' => 15000,
                'salary_max' => 24000,
                'experience_level' => 'Entry to Mid Level',
                'education' => 'Relevant experience accepted',
                'status' => 'active',
                'views' => 16,
                'is_active' => true,
                'skills' => ['Linux', 'Communication', 'Attention to Detail', 'Problem Solving', 'Teamwork'],
            ],
        ];
    }

    private function applications(): array
    {
        return [
            ['company_key' => 'techlabs', 'job_key' => 'laravel', 'seeker_key' => 'nour', 'ai_score' => 92.50, 'missing_skills' => [], 'status' => 'shortlisted', 'history_note' => 'Strong match. Ready for technical interview.'],
            ['company_key' => 'nilecommerce', 'job_key' => 'react', 'seeker_key' => 'omar', 'ai_score' => 88.00, 'missing_skills' => [], 'status' => 'under_review', 'history_note' => 'Portfolio review in progress.'],
            ['company_key' => 'datavision', 'job_key' => 'data', 'seeker_key' => 'salma', 'ai_score' => 90.25, 'missing_skills' => ['Power BI'], 'status' => 'shortlisted', 'history_note' => 'Good analytics background.'],
            ['company_key' => 'techlabs', 'job_key' => 'qa', 'seeker_key' => 'youssef', 'ai_score' => 76.00, 'missing_skills' => ['Automation framework'], 'status' => 'applied', 'history_note' => 'New application.'],
            ['company_key' => 'nilecommerce', 'job_key' => 'devops', 'seeker_key' => 'nour', 'ai_score' => 54.50, 'missing_skills' => ['Kubernetes', 'AWS'], 'status' => 'rejected', 'history_note' => 'Missing core DevOps requirements.'],
            ['company_key' => 'techlabs', 'job_key' => 'fullstack', 'seeker_key' => 'omar', 'ai_score' => 84.00, 'missing_skills' => ['PHP', 'Laravel'], 'status' => 'under_review', 'history_note' => 'Strong frontend, ramping up on Laravel.'],
            ['company_key' => 'fintrust', 'job_key' => 'finmobile', 'seeker_key' => 'omar', 'ai_score' => 81.50, 'missing_skills' => [], 'status' => 'shortlisted', 'history_note' => 'Good React Native fit.'],
            ['company_key' => 'medicare', 'job_key' => 'healthfrontend', 'seeker_key' => 'omar', 'ai_score' => 86.75, 'missing_skills' => [], 'status' => 'applied', 'history_note' => 'New application.'],
            ['company_key' => 'datavision', 'job_key' => 'datascientist', 'seeker_key' => 'salma', 'ai_score' => 78.25, 'missing_skills' => ['Machine Learning'], 'status' => 'under_review', 'history_note' => 'Solid analytics base, growing ML depth.'],
            ['company_key' => 'greenenergy', 'job_key' => 'iotengineer', 'seeker_key' => 'salma', 'ai_score' => 72.00, 'missing_skills' => ['Redis'], 'status' => 'applied', 'history_note' => 'New application.'],
            ['company_key' => 'securenet', 'job_key' => 'socanalyst', 'seeker_key' => 'youssef', 'ai_score' => 69.50, 'missing_skills' => [], 'status' => 'shortlisted', 'history_note' => 'Good entry-level security potential.'],
        ];
    }

    private function messageThreads(): array
    {
        return [
            [
                'company_key' => 'techlabs',
                'seeker_key' => 'nour',
                'job_key' => 'laravel',
                'interview_at' => now()->addDays(2)->setTime(13, 0)->toDateTimeString(),
                'messages' => [
                    ['from' => 'company', 'content' => 'Hi Nour, your Laravel application looks strong. Can we schedule a technical interview?'],
                    ['from' => 'seeker', 'content' => 'Sure, I am available this week.'],
                    ['from' => 'company', 'content' => 'Interview scheduled for the Laravel Backend Developer role. Please prepare a recent API project.'],
                ],
            ],
            [
                'company_key' => 'nilecommerce',
                'seeker_key' => 'omar',
                'job_key' => 'react',
                'messages' => [
                    ['from' => 'company', 'content' => 'Hi Omar, thanks for applying. Do you have a live React portfolio?'],
                    ['from' => 'seeker', 'content' => 'Yes, I can share two dashboards and a marketplace UI sample.'],
                ],
            ],
            [
                'company_key' => 'datavision',
                'seeker_key' => 'salma',
                'job_key' => 'data',
                'interview_at' => now()->addDays(3)->setTime(11, 30)->toDateTimeString(),
                'messages' => [
                    ['from' => 'company', 'content' => 'Hello Salma, we liked your SQL and Python background.'],
                    ['from' => 'company', 'content' => 'Interview scheduled for the Data Analyst role. The call will include a short case study.'],
                ],
            ],
        ];
    }
}
