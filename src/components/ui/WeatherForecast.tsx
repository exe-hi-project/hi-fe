import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  locationName: string;
  iconColor: string;
  bgGradient: string;
}

export default function WeatherForecast() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchWeatherAndLocation(lat?: number, lon?: number) {
      try {
        let finalLat = lat;
        let finalLon = lon;
        let locationName = 'TP. HCM';

        // 1. Fetch location details from BigDataCloud (supports IP fallback)
        try {
          const url = lat && lon
            ? `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
            : `https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=vi`;
          
          const geoRes = await fetch(url);
          const geoData = await geoRes.json();
          
          if (active) {
            locationName = geoData.city || geoData.locality || geoData.principalSubdivision || 'TP. HCM';
            
            // Clean up and format Vietnamese region prefix strings
            if (locationName.startsWith('Thành phố ')) {
              locationName = locationName.replace('Thành phố ', 'TP. ');
            }
            if (locationName.startsWith('Tỉnh ')) {
              locationName = locationName.replace('Tỉnh ', '');
            }
            if (locationName.startsWith('Quận ')) {
              locationName = locationName.replace('Quận ', 'Q. ');
            }
            
            // If GPS wasn't used, fetch weather for coordinates resolved by IP
            if (!finalLat && geoData.latitude) {
              finalLat = geoData.latitude;
            }
            if (!finalLon && geoData.longitude) {
              finalLon = geoData.longitude;
            }
          }
        } catch (e) {
          console.warn('Geocoding failed, falling back to default/GPS coords', e);
        }

        // Fallbacks if geocoding or coordinates resolve failed
        const queryLat = finalLat ?? 10.8231;
        const queryLon = finalLon ?? 106.6297;

        // 2. Fetch weather forecast from Open-Meteo
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${queryLat}&longitude=${queryLon}&current=temperature_2m,weather_code`
        );
        const data = await res.json();
        
        if (!active) return;

        const code = data.current?.weather_code ?? 0;
        const temp = Math.round(data.current?.temperature_2m ?? 28);

        // Map WMO Weather Interpretation Codes (WMOCode)
        let description = 'Nắng ráo';
        let icon = 'wb_sunny';
        let iconColor = 'text-amber-500';
        let bgGradient = 'from-amber-100/50 to-orange-100/50 dark:from-amber-950/20 dark:to-orange-950/20';

        if (code === 0) {
          description = 'Trời nắng';
          icon = 'wb_sunny';
          iconColor = 'text-amber-500';
          bgGradient = 'from-amber-100/50 to-orange-100/50 dark:from-amber-950/20 dark:to-orange-950/20';
        } else if (code >= 1 && code <= 3) {
          description = 'Mây rải rác';
          icon = 'partly_cloudy_day';
          iconColor = 'text-sky-400';
          bgGradient = 'from-sky-100/50 to-blue-100/50 dark:from-sky-950/20 dark:to-blue-950/20';
        } else if (code === 45 || code === 48) {
          description = 'Có sương mù';
          icon = 'foggy';
          iconColor = 'text-slate-400';
          bgGradient = 'from-slate-100/50 to-zinc-100/50 dark:from-slate-950/20 dark:to-zinc-950/20';
        } else if (code >= 51 && code <= 55) {
          description = 'Mưa phùn';
          icon = 'rainy_light';
          iconColor = 'text-blue-300';
          bgGradient = 'from-blue-100/30 to-indigo-100/30 dark:from-blue-950/10 dark:to-indigo-950/10';
        } else if (code >= 61 && code <= 65) {
          description = 'Có mưa';
          icon = 'rainy';
          iconColor = 'text-blue-500';
          bgGradient = 'from-blue-100/50 to-indigo-100/50 dark:from-blue-950/20 dark:to-indigo-950/20';
        } else if (code >= 80 && code <= 82) {
          description = 'Mưa rào';
          icon = 'rainy_heavy';
          iconColor = 'text-blue-600';
          bgGradient = 'from-blue-200/50 to-indigo-200/50 dark:from-blue-900/20 dark:to-indigo-900/20';
        } else if (code >= 95) {
          description = 'Giông bão';
          icon = 'thunderstorm';
          iconColor = 'text-violet-500';
          bgGradient = 'from-violet-100/50 to-purple-200/50 dark:from-violet-950/20 dark:to-purple-950/20';
        }

        setWeather({ temp, description, icon, locationName, iconColor, bgGradient });
        setLoading(false);
      } catch (err) {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherAndLocation(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeatherAndLocation(); // IP based fallback
        }
      );
    } else {
      fetchWeatherAndLocation(); // IP based fallback
    }

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/60 shadow-sm animate-pulse max-w-sm">
        <div className="w-10 h-10 rounded-xl bg-slate-200/60 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-300 text-[20px] animate-spin">progress_activity</span>
        </div>
        <div className="space-y-1.5 flex-grow">
          <div className="h-3.5 w-24 bg-slate-200/60 rounded-full" />
          <div className="h-3 w-16 bg-slate-200/50 rounded-full" />
        </div>
      </div>
    );
  }

  const finalWeather = weather || {
    temp: 28,
    description: 'Nắng nhẹ',
    icon: 'partly_cloudy_day',
    locationName: 'TP. HCM',
    iconColor: 'text-sky-400',
    bgGradient: 'from-sky-100/50 to-blue-100/50',
  };

  return (
    <div className="flex items-center gap-3.5 bg-white/40 hover:bg-white/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(148,163,184,0.05)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-300 hover:shadow-[0_12px_36px_0_rgba(148,163,184,0.08)] hover:scale-[1.02] active:scale-[0.98] cursor-default group max-w-xs md:max-w-sm">
      {/* Dynamic background icon container */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${finalWeather.bgGradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
        <span className={`material-symbols-outlined ${finalWeather.iconColor} text-[22px] transition-transform duration-500 group-hover:rotate-6`}>
          {finalWeather.icon}
        </span>
      </div>
      
      {/* Weather Info Text */}
      <div className="flex flex-col select-none">
        <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-sm tracking-tight leading-tight">
          <span className="truncate max-w-[125px]">{finalWeather.locationName}</span>
          <span className="text-slate-300 font-normal">|</span>
          <span className="text-sky-600 font-black tracking-tight">{finalWeather.temp}°C</span>
        </div>
        <p className="text-slate-500 font-semibold text-[11px] mt-0.5 tracking-wide leading-none capitalize">
          {finalWeather.description}
        </p>
      </div>
    </div>
  );
}
