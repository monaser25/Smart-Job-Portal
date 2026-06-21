<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PublicSettingController extends Controller
{
    use ApiResponse;

    private const DEFAULT_CONTACT_INFO = [
        'email' => 'support@smartjobportal.com',
        'phone' => '+1 (555) 123-4567',
        'location' => '100 Innovation Drive',
    ];

    public function contactInfo(Request $request)
    {
        $setting = SiteSetting::query()->first();

        return $this->success([
            'email' => $setting?->contact_email ?? self::DEFAULT_CONTACT_INFO['email'],
            'phone' => $setting?->contact_phone ?? self::DEFAULT_CONTACT_INFO['phone'],
            'location' => $setting?->contact_location ?? self::DEFAULT_CONTACT_INFO['location'],
        ]);
    }
}
