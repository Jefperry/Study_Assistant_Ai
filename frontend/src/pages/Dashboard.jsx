import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Brain, LogOut, Plus, FileText, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API, getToken, clearTokens } from '../App';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  
  const [noteData, setNoteData] = useState({
    title: '',
    text: '',
    generate_flashcards: true
  });

  useEffect(() => {
    fetchUser();
    fetchSummaries();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setUser(response.data);
    } catch (error) {
      toast.error('Session expired');
      handleLogout();
    }
  };

  const fetchSummaries = async () => {
    try {
      const response = await axios.get(`${API}/summaries`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSummaries(response.data);
    } catch (error) {
      toast.error('Failed to load summaries');
    }
  };

  const handleGenerateSummary = async (e) => {
    e.preventDefault();
    if (!noteData.text.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post(
        `${API}/ai/summarize`,
        noteData,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      toast.success('Summary generated successfully!');
      setSelectedSummary(response.data);
      setShowNewNote(false);
      setNoteData({ title: '', text: '', generate_flashcards: true });
      fetchSummaries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSummary = async (id) => {
    try {
      await axios.delete(`${API}/summaries/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      toast.success('Summary deleted');
      if (selectedSummary?.id === id) {
        setSelectedSummary(null);
      }
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to delete summary');
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">StudyAI</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
              </div>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline"
              className="gap-2"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar - Summaries List */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0" data-testid="summaries-list">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Summaries</CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => setShowNewNote(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    data-testid="new-note-btn"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {summaries.length === 0 ? (
                    <div className="p-6 text-center text-gray-500" data-testid="no-summaries-message">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No summaries yet</p>
                      <p className="text-sm">Create your first one!</p>
                    </div>
                  ) : (
                    summaries.map((summary) => (
                      <div key={summary.id}>
                        <div
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedSummary?.id === summary.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                          }`}
                          onClick={() => setSelectedSummary(summary)}
                          data-testid={`summary-item-${summary.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{summary.title}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(summary.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSummary(summary.id);
                              }}
                              data-testid={`delete-summary-${summary.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <Separator />
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {showNewNote ? (
              <Card className="shadow-lg border-0 animate-scale-in" data-testid="new-note-form">
                <CardHeader>
                  <CardTitle>Create New Summary</CardTitle>
                  <CardDescription>Paste your class notes below</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGenerateSummary} className="space-y-4">
                    <div>
                      <Input
                        placeholder="Title (optional)"
                        value={noteData.title}
                        onChange={(e) => setNoteData({ ...noteData, title: e.target.value })}
                        data-testid="note-title-input"
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="Paste your class notes here..."
                        value={noteData.text}
                        onChange={(e) => setNoteData({ ...noteData, text: e.target.value })}
                        rows={12}
                        className="resize-none"
                        required
                        data-testid="note-text-input"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Button 
                        type="submit" 
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        data-testid="generate-summary-btn"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate Summary'
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowNewNote(false)}
                        data-testid="cancel-note-btn"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : selectedSummary ? (
              <div className="space-y-6 animate-fade-in" data-testid="summary-view">
                {/* Summary Card */}
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {selectedSummary.title}
                    </CardTitle>
                    <CardDescription>
                      Created on {new Date(selectedSummary.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap" data-testid="summary-text">
                          {selectedSummary.summary_text}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Flashcards */}
                {selectedSummary.flashcards && selectedSummary.flashcards.length > 0 && (
                  <Card className="shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        Flashcards
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedSummary.flashcards.map((card, index) => (
                          <div key={index} className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg" data-testid={`flashcard-${index}`}>
                            <div className="flex items-start gap-2 mb-3">
                              <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 mb-2" data-testid={`flashcard-question-${index}`}>
                                  {card.question}
                                </p>
                                <p className="text-gray-700" data-testid={`flashcard-answer-${index}`}>
                                  {card.answer}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="shadow-lg border-0 h-[calc(100vh-280px)] flex items-center justify-center" data-testid="empty-state">
                <CardContent className="text-center">
                  <Brain className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Summary Selected</h3>
                  <p className="text-gray-500 mb-6">Select a summary or create a new one to get started</p>
                  <Button 
                    onClick={() => setShowNewNote(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    data-testid="create-first-summary-btn"
                  >
                    Create Your First Summary
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;