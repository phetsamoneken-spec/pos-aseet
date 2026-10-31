import React, { useState } from 'react';
import { Download, CheckCircle, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  language?: 'lo' | 'en';
}

export const PWAInstallButton: React.FC<Props> = ({ language = 'lo' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, show small badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>{language === 'lo' ? 'ຕິດຕັ້ງແລ້ວ' : 'PWA Installed'}</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{language === 'lo' ? 'ຕິດຕັ້ງແອັບ PWA' : 'Install App'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'lo' ? 'ຕິດຕັ້ງເທິງ iPhone' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'lo' ? 'ວິທີຕິດຕັ້ງແອັບເທິງ iPhone / iPad' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <p>
                    {language === 'lo'
                      ? 'ກົດປຸ່ມ Share (ແບ່ງປັນ) ທີ່ແຖບລຸ່ມຂອງ Safari'
                      : 'Tap the Share icon at the bottom of Safari'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <p>
                    {language === 'lo'
                      ? 'ເລື່ອນລົງແລ້ວກົດເລືອກ "Add to Home Screen" (ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ)'
                      : 'Scroll down and tap "Add to Home Screen"'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <p>
                    {language === 'lo'
                      ? 'ກົດ "Add" ຢູ່ມຸມຂວາເທິງ ເພື່ອສຳເລັດການຕິດຕັ້ງ'
                      : 'Tap "Add" in the top-right corner to complete'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                {language === 'lo' ? 'ເຂົ້າໃຈແລ້ວ' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
