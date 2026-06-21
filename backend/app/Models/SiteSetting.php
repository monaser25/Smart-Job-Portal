<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'contact_email',
        'contact_phone',
        'contact_location',
    ];
}
