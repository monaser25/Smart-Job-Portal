<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Application;
use App\Models\JobPost;
use App\Models\SiteSetting;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    use ApiResponse;

    public function stats(): JsonResponse
    {
        $startOfWeek = now()->startOfWeek();

        $stats = [
            'total_users'            => User::count(),
            'new_users_this_week'    => User::where('created_at', '>=', $startOfWeek)->count(),
            'total_jobs'             => JobPost::count(),
            'active_jobs'            => JobPost::active()->count(),
            'total_applications'     => Application::count(),
            'applications_this_week' => Application::where('created_at', '>=', $startOfWeek)->count(),
            'banned_users'           => User::where('is_banned', true)->count(),
        ];

        return $this->success($stats);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('is_banned')) {
            $query->where('is_banned', filter_var($request->is_banned, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'LIKE', "%{$request->search}%")
                  ->orWhere('email', 'LIKE', "%{$request->search}%");
            });
        }

        $users = $query->latest()->paginate(15);

        return $this->success(UserResource::collection($users));
    }

    public function showUser(User $user): JsonResponse
    {
        $profile = null;

        if ($user->role === 'job_seeker') {
            $user->load([
                'jobSeekerProfile.jobSeekerSkills.skill',
                'jobSeekerProfile.cvParsedData',
            ]);
            $profile = $user->jobSeekerProfile;
        } elseif ($user->role === 'company') {
            $user->load('companyProfile');
            if ($user->companyProfile) {
                $user->companyProfile->loadCount('jobPosts');
            }
            $profile = $user->companyProfile;
        }

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_banned' => (bool) $user->is_banned,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'profile' => $profile,
        ], 'OK');
    }

    public function toggleBan(Request $request, User $user): JsonResponse
    {
        // Prevent an admin from locking themselves out, and prevent banning
        // other admin accounts via this endpoint.
        if ($request->user()->id === $user->id) {
            return $this->error('You cannot ban your own account.', 422);
        }
        if ($user->role === 'admin') {
            return $this->error('Admin accounts cannot be banned through this endpoint.', 422);
        }

        $user->is_banned = !$user->is_banned;
        $user->save();

        $message = $user->is_banned ? 'User banned.' : 'User unbanned.';

        return $this->success(new UserResource($user), $message);
    }

    public function jobs(Request $request): JsonResponse
    {
        if ($request->filled('trashed') && $request->trashed === 'only') {
            $query = JobPost::onlyTrashed()->with('companyProfile');
        } else {
            $query = JobPost::withTrashed()->with('companyProfile');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhereHas('companyProfile', function ($q2) use ($search) {
                      $q2->where('company_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        return $this->success($query->latest()->paginate(15));
    }

    public function forceDeleteJob($id): JsonResponse
    {
        $job = JobPost::withTrashed()->findOrFail($id);
        $job->forceDelete();

        return $this->success(null, 'Job permanently deleted.');
    }
    public function verifyUser(User $user): JsonResponse
    {
        $user->update(['email_verified_at' => now()]);
        return $this->success(null, 'User verified successfully.');
    }

    public function verifyPassword(Request $request): JsonResponse
    {
        $request->validate(['password' => 'required|string']);
        if (\Hash::check($request->password, $request->user()->password)) {
            return $this->success(null, 'Password verified.');
        }
        return $this->error('Incorrect password.', 403);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'currentPassword' => 'sometimes|nullable|string',
            'newPassword' => 'sometimes|nullable|string|min:8',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        
        // If email or password is being changed, require current password
        $changingEmail = isset($validated['email']) && $validated['email'] !== $user->email;
        $changingPassword = !empty($validated['newPassword']);

        if ($changingEmail || $changingPassword) {
            if (empty($validated['currentPassword']) || !\Hash::check($validated['currentPassword'], $user->password)) {
                return $this->error('Your current password is required and must be correct to change your email or password.', 403);
            }
            
            if ($changingEmail) {
                $user->email = $validated['email'];
            }
            
            if ($changingPassword) {
                $user->password = $validated['newPassword'];
            }
        }
        
        $user->save();
        
        return $this->success($user, 'Settings updated successfully.');
    }

    public function updateContactInfo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
        ]);

        $setting = SiteSetting::query()->first() ?? new SiteSetting();
        $setting->fill([
            'contact_email' => $validated['email'] ?? null,
            'contact_phone' => $validated['phone'] ?? null,
            'contact_location' => $validated['location'] ?? null,
        ]);
        $setting->save();

        return $this->success([
            'email' => $setting->contact_email,
            'phone' => $setting->contact_phone,
            'location' => $setting->contact_location,
        ]);
    }
}
