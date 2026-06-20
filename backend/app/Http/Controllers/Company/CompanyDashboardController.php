<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class CompanyDashboardController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $company = $request->user()->companyProfile;
        $jobIds  = $company->jobPosts()->pluck('id');

        $recentApplicants = Application::whereIn('job_id', $jobIds)
            ->with(['jobSeekerProfile.user', 'jobPost'])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($app) {
                return [
                    'application_id'  => $app->id,
                    'applicant_name'  => $app->jobSeekerProfile->user->name ?? 'Unknown',
                    'applicant_email' => $app->jobSeekerProfile->user->email ?? 'Unknown',
                    'job_title'       => $app->jobPost->title ?? 'Unknown',
                    'ai_score'        => (float) $app->ai_score,
                    'status'          => $app->status,
                    'applied_at'      => $app->created_at,
                ];
            });

        $topJobs = $company->jobPosts()
            ->withCount('applications')
            ->orderByDesc('applications_count')
            ->take(5)
            ->get()
            ->map(function ($job) {
                return [
                    'id'               => $job->id,
                    'title'            => $job->title,
                    'applicants_count' => $job->applications_count,
                    'is_active'        => (bool) $job->is_active,
                ];
            });

        $data = [
            'total_jobs'               => $company->jobPosts()->count(),
            'active_jobs'              => $company->jobPosts()->where('is_active', true)->count(),
            'total_applicants'         => Application::whereIn('job_id', $jobIds)->count(),
            'new_applicants_this_week' => Application::whereIn('job_id', $jobIds)
                                            ->where('created_at', '>=', now()->subDays(7))
                                            ->count(),
            'shortlisted'              => Application::whereIn('job_id', $jobIds)
                                            ->where('status', 'shortlisted')->count(),
            'approved'                 => Application::whereIn('job_id', $jobIds)
                                            ->where('status', 'approved')->count(),
            'rejected'                 => Application::whereIn('job_id', $jobIds)
                                            ->where('status', 'rejected')->count(),
            'under_review'             => Application::whereIn('job_id', $jobIds)
                                            ->where('status', 'under_review')->count(),
            'recent_applicants'        => $recentApplicants,
            'top_jobs'                 => $topJobs,
        ];

        return $this->success($data, 'OK');
    }
}
