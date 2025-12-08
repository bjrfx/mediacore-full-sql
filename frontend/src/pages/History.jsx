import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store';
import { MediaList } from '../components/media';
import { Button } from '../components/ui/button';

export default function History() {
  const { history, clearHistory } = usePlayerStore();

  const handleClearHistory = () => {
    if (window.confirm('Clear all listening history?')) {
      clearHistory();
    }
  };

  return (
    <div className="min-h-full px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Recently Played</h1>
            <p className="text-muted-foreground text-sm">
              {history.length} tracks
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={handleClearHistory}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        )}
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No listening history yet
          </h3>
          <p className="text-muted-foreground">
            Content you play will appear here
          </p>
        </div>
      ) : (
        <MediaList media={history} showDate />
      )}
    </div>
  );
}
