import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Could not clear localStorage', e);
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດແອັບ
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                ແອັບພລິເຄຊັນບໍ່ສາມາດສະແດງຜົນໄດ້ເນື່ອງຈາກມີຂໍ້ຜິດພາດ. ທ່ານສາມາດລອງໂຫຼດຄືນໃໝ່ ຫຼື ລ້າງແຄຊ໌ເພື່ອເລີ່ມຕົ້ນໃໝ່.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-rose-300 font-mono text-left overflow-x-auto max-h-32">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 shadow-md shadow-blue-600/30"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ໂຫຼດຄືນໃໝ່</span>
              </button>

              <button
                onClick={this.handleReset}
                className="py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>ຣີເຊັດຂໍ້ມູນ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
