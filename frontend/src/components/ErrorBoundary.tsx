'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tg-bg flex flex-col items-center justify-center p-6 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-tg-text font-semibold text-lg text-center">
            Что-то пошло не так
          </p>
          <p className="text-tg-hint text-sm text-center max-w-xs">
            Попробуйте перезагрузить приложение
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="mt-2 px-6 py-3 bg-tg-button rounded-xl text-tg-button-text font-medium transition-transform active:scale-95"
          >
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
