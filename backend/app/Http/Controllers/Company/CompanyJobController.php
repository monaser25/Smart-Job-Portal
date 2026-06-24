<?php

namespace App\Http\Controllers\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Job\StoreJobRequest;
use App\Http\Requests\Job\UpdateJobRequest;
use App\Http\Resources\JobResource;
use App\Models\JobPost;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompanyJobController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $jobs = $request->user()->companyProfile
            ->jobPosts()
            ->withCount('applications')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim($request->search);

                $query->where(function ($inner) use ($search) {
                    $inner->where('title', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('work_mode', 'like', "%{$search}%")
                        ->orWhere('experience_level', 'like', "%{$search}%")
                        ->orWhere('education', 'like', "%{$search}%")
                        ->orWhere('job_type', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('jobRequiredSkills.skill', function ($skillQuery) use ($search) {
                            $skillQuery->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->filled('status') && $request->status !== 'all', function ($query) use ($request) {
                $query->where('status', $request->status);
            })
            ->latest()
            ->paginate(15);

        return $this->success(JobResource::collection($jobs));
    }

    public function store(StoreJobRequest $request)
    {
        $job = DB::transaction(function () use ($request) {
            $job = $request->user()->companyProfile->jobPosts()->create(
                $request->only(
                    'title', 'category', 'description', 'responsibilities', 
                    'location', 'work_mode', 'job_type', 'experience_level', 
                    'education', 'salary_min', 'salary_max', 'status'
                ) + ['is_active' => $request->input('status') !== 'draft']
            );

            $insertedSkillIds = [];
            foreach ($request->skills as $skill) {
                // If it's a new string skill passed from frontend instead of just IDs
                if (isset($skill['name'])) {
                    // Case-insensitive lookup/create
                    $skillModel = \App\Models\Skill::firstOrCreate(['name' => $skill['name']]);
                    $skillId = $skillModel->id;
                } else {
                    $skillId = $skill['id'];
                }

                if (!in_array($skillId, $insertedSkillIds)) {
                    $job->jobRequiredSkills()->create([
                        'skill_id'     => $skillId,
                        'is_mandatory' => $skill['is_mandatory'] ?? true,
                    ]);
                    $insertedSkillIds[] = $skillId;
                }
            }

            return $job;
        });

        return $this->success(
            new JobResource($job->load('jobRequiredSkills.skill')),
            'Job posted successfully.',
            201
        );
    }

    public function show(Request $request, JobPost $job)
    {
        if ($request->user()->cannot('update', $job)) {
            return $this->error('Forbidden.', 403);
        }

        return $this->success(
            new JobResource($job->load(['jobRequiredSkills.skill'])->loadCount('applications'))
        );
    }

    public function update(UpdateJobRequest $request, JobPost $job)
    {
        if ($request->user()->cannot('update', $job)) {
            return $this->error('Forbidden.', 403);
        }

        DB::transaction(function () use ($request, $job) {
            $dataToUpdate = $request->only(
                'title', 'category', 'description', 'responsibilities', 
                'location', 'work_mode', 'job_type', 'experience_level', 
                'education', 'salary_min', 'salary_max', 'status'
            );
            if ($request->has('status')) {
                $dataToUpdate['is_active'] = $request->input('status') !== 'draft' && $request->input('status') !== 'paused' && $request->input('status') !== 'closed';
            }
            $job->update($dataToUpdate);

            if ($request->has('skills')) {
                $job->jobRequiredSkills()->delete();
                $insertedSkillIds = [];
                foreach ($request->skills as $skill) {
                    if (isset($skill['name'])) {
                        $skillModel = \App\Models\Skill::firstOrCreate(['name' => $skill['name']]);
                        $skillId = $skillModel->id;
                    } else {
                        $skillId = $skill['id'];
                    }

                    if (!in_array($skillId, $insertedSkillIds)) {
                        $job->jobRequiredSkills()->create([
                            'skill_id'     => $skillId,
                            'is_mandatory' => $skill['is_mandatory'] ?? true,
                        ]);
                        $insertedSkillIds[] = $skillId;
                    }
                }
            }
        });

        return $this->success(
            new JobResource($job->fresh()->load('jobRequiredSkills.skill')),
            'Job updated.'
        );
    }

    public function destroy(Request $request, JobPost $job)
    {
        if ($request->user()->cannot('delete', $job)) {
            return $this->error('Forbidden.', 403);
        }

        $job->delete();
        return $this->success(null, 'Job deleted.');
    }

    public function toggle(Request $request, JobPost $job)
    {
        if ($request->user()->cannot('update', $job)) {
            return $this->error('Forbidden.', 403);
        }

        $isActive = !$job->is_active;
        $job->update([
            'is_active' => $isActive,
            'status'    => $isActive ? 'active' : 'paused',
        ]);

        return $this->success(
            new JobResource($job->fresh()),
            $isActive ? 'Job activated.' : 'Job paused.'
        );
    }
}
