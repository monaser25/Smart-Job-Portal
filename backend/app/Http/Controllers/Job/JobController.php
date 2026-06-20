<?php

namespace App\Http\Controllers\Job;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobResource;
use App\Models\JobPost;
use App\Models\Notification;
use App\Services\MatchingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\ApiResponse;

class JobController extends Controller
{
    use ApiResponse;

    public function __construct(private MatchingService $matchingService) {}

    public function index(Request $request)
    {
        $query = JobPost::query()->active()->with(['companyProfile', 'jobRequiredSkills.skill']);

        if ($request->filled('keyword')) {
            $keyword = $request->keyword;
            $query->where(function ($q) use ($keyword) {
                $q->where('title', 'LIKE', "%{$keyword}%")
                  ->orWhere('description', 'LIKE', "%{$keyword}%")
                  ->orWhere('location', 'LIKE', "%{$keyword}%")
                  ->orWhere('category', 'LIKE', "%{$keyword}%")
                  ->orWhereHas('companyProfile', function ($companyQuery) use ($keyword) {
                      $companyQuery->where('company_name', 'LIKE', "%{$keyword}%");
                  })
                  ->orWhereHas('jobRequiredSkills.skill', function ($skillQuery) use ($keyword) {
                      $skillQuery->where('name', 'LIKE', "%{$keyword}%");
                  });
            });
        }

        if ($request->filled('location')) {
            $query->where('location', 'LIKE', "%{$request->location}%");
        }

        if ($request->filled('job_type')) {
            $types = is_array($request->job_type) ? $request->job_type : explode(',', (string) $request->job_type);
            $types = array_values(array_filter(array_map(fn ($type) => trim((string) $type), $types)));

            if (!empty($types)) {
                $query->whereIn('job_type', $types);
            }
        }

        if ($request->filled('category')) {
            $categories = is_array($request->category) ? $request->category : explode(',', (string) $request->category);
            $categories = array_values(array_filter(array_map(fn ($category) => trim((string) $category), $categories)));

            if (!empty($categories)) {
                $query->whereIn('category', $categories);
            }
        }

        if ($request->filled('experience_level')) {
            $this->applyExperienceLevelFilter($query, $request->input('experience_level'));
        }

        if ($request->filled('salary_range')) {
            $query->where('salary_range', $request->salary_range);
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);
        $jobs = $query->paginate($perPage);

        return $this->success(JobResource::collection($jobs));
    }

    public function show(JobPost $job)
    {
        return $this->success(
            new JobResource($job->load(['jobRequiredSkills.skill', 'companyProfile']))
        );
    }

    public function recordView(Request $request, JobPost $job)
    {
        $user = $request->user();

        if ($user->role !== 'job_seeker') {
            return $this->success([
                'recorded' => false,
                'views' => $job->views,
            ]);
        }

        $recorded = false;

        DB::transaction(function () use ($job, $user, &$recorded) {
            $alreadyViewed = DB::table('job_post_views')
                ->where('job_id', $job->id)
                ->where('user_id', $user->id)
                ->exists();

            if ($alreadyViewed) {
                return;
            }

            DB::table('job_post_views')->insert([
                'job_id' => $job->id,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $job->increment('views');
            $recorded = true;

            $companyUserId = $job->companyProfile?->user_id;
            if ($companyUserId) {
                Notification::create([
                    'user_id' => $companyUserId,
                    'type' => 'job_viewed',
                    'data' => [
                        'type' => 'job_viewed',
                        'title' => "{$user->name} viewed your job",
                        'message' => "{$user->name} viewed \"{$job->title}\".",
                        'viewer_id' => $user->id,
                        'viewer_name' => $user->name,
                        'job_id' => $job->id,
                        'job_title' => $job->title,
                    ],
                    'created_at' => now(),
                ]);
            }
        });

        $job->refresh();

        return $this->success([
            'recorded' => $recorded,
            'views' => $job->views,
        ]);
    }

    private function applyExperienceLevelFilter($query, mixed $levels): void
    {
        $levels = is_array($levels) ? $levels : explode(',', (string) $levels);
        $keywords = [];

        foreach ($levels as $level) {
            $normalized = strtolower(trim((string) $level));
            if ($normalized === '') {
                continue;
            }

            if (str_contains($normalized, 'intern')) {
                array_push($keywords, 'internship', 'intern');
            } elseif (str_contains($normalized, 'entry') || str_contains($normalized, 'junior')) {
                array_push($keywords, 'entry', 'junior');
            } elseif (str_contains($normalized, 'mid')) {
                $keywords[] = 'mid';
            } elseif (str_contains($normalized, 'senior')) {
                $keywords[] = 'senior';
            } elseif (str_contains($normalized, 'lead') || str_contains($normalized, 'manager')) {
                array_push($keywords, 'lead', 'manager');
            } elseif (str_contains($normalized, 'executive') || str_contains($normalized, 'director')) {
                array_push($keywords, 'executive', 'director');
            } else {
                $keywords[] = $normalized;
            }
        }

        $keywords = array_values(array_unique(array_filter($keywords)));
        if (empty($keywords)) {
            return;
        }

        $query->where(function ($levelQuery) use ($keywords) {
            foreach ($keywords as $keyword) {
                $levelQuery->orWhereRaw('LOWER(experience_level) LIKE ?', ["%{$keyword}%"]);
            }
        });
    }

    public function recommended(Request $request)
    {
        $profile        = $request->user()->jobSeekerProfile;
        $seekerSkillIds = $profile->jobSeekerSkills()->pluck('skill_id');

        $jobs = JobPost::active()->with(['companyProfile', 'jobRequiredSkills.skill'])->get();

        $recommended = $jobs->map(function ($job) use ($seekerSkillIds) {
            $score = $this->matchingService->calculateScore($seekerSkillIds, $job->jobRequiredSkills);
            $job->setAttribute('ai_score', $score);
            return $job;
        })
        ->filter(fn ($job) => $job->ai_score > 0)
        ->sortByDesc('ai_score')
        ->take(20)
        ->values();

        return $this->success(JobResource::collection($recommended));
    }
}
