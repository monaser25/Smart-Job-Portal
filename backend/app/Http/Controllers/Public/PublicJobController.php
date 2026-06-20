<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobResource;
use App\Models\JobPost;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PublicJobController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $jobs = JobPost::active()
            ->with(['companyProfile', 'jobRequiredSkills.skill'])
            ->when($request->keyword, fn ($q, $k) =>
                $q->where(fn ($q2) =>
                    $q2->where('title', 'like', "%$k%")
                       ->orWhere('description', 'like', "%$k%")
                       ->orWhere('location', 'like', "%$k%")
                       ->orWhere('category', 'like', "%$k%")
                       ->orWhereHas('companyProfile', fn ($companyQuery) =>
                           $companyQuery->where('company_name', 'like', "%$k%")
                       )
                       ->orWhereHas('jobRequiredSkills.skill', fn ($skillQuery) =>
                           $skillQuery->where('name', 'like', "%$k%")
                       )
                )
            )
            ->when($request->location, fn ($q, $l) =>
                $q->where('location', 'like', "%$l%")
            )
            ->when($request->job_type, function ($q, $types) {
                $types = is_array($types) ? $types : explode(',', (string) $types);
                $types = array_values(array_filter(array_map(fn ($type) => trim((string) $type), $types)));

                if (empty($types)) {
                    return;
                }

                $q->whereIn('job_type', $types);
            })
            ->when($request->category, function ($q, $categories) {
                $categories = is_array($categories) ? $categories : explode(',', (string) $categories);
                $categories = array_values(array_filter(array_map(fn ($category) => trim((string) $category), $categories)));

                if (empty($categories)) {
                    return;
                }

                $q->whereIn('category', $categories);
            })
            ->when($request->experience_level, fn ($q, $levels) =>
                $this->applyExperienceLevelFilter($q, $levels)
            )
            ->latest()
            ->paginate(min(max((int) $request->input('per_page', 15), 1), 100));

        return $this->success(JobResource::collection($jobs));
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

    public function show(JobPost $job)
    {
        if (!$job->is_active) {
            return $this->error('Job not found.', 404);
        }

        $job->load(['companyProfile', 'jobRequiredSkills.skill']);

        return $this->success(new JobResource($job));
    }
}
