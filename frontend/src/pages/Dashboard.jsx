import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, LogOut, Plus, FileText, Trash2, BookOpen, Loader2, 
  Upload, Search, File, Link, ExternalLink, Sparkles, 
  AlertCircle, CheckCircle, Clock, RefreshCw, Library, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { papersAPI, summariesAPI, searchAPI, aiAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  
  // Papers state
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Summaries state
  const [summaries, setSummaries] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState('papers');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [arxivUrl, setArxivUrl] = useState('');

  useEffect(() => {
    fetchPapers();
    fetchSummaries();
  }, []);

  // ===========================================
  // Papers Functions
  // ===========================================
  const fetchPapers = async () => {
    try {
      const response = await papersAPI.list();
      const data = response.data;
      // Handle various response formats
      if (Array.isArray(data)) {
        setPapers(data);
      } else if (data?.items && Array.isArray(data.items)) {
        setPapers(data.items);
      } else if (data?.papers && Array.isArray(data.papers)) {
        setPapers(data.papers);
      } else {
        setPapers([]);
      }
    } catch (error) {
      console.error('Failed to load papers:', error);
      setPapers([]);
      toast.error('Failed to load papers');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await papersAPI.upload(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success('Paper uploaded successfully!');
      fetchPapers();
      refreshUser();
      setShowUploadForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload paper');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleArxivUpload = async () => {
    if (!arxivUrl.trim()) {
      toast.error('Please enter an ArXiv URL');
      return;
    }

    setIsUploading(true);
    try {
      const response = await papersAPI.uploadArxiv(arxivUrl);
      toast.success('ArXiv paper imported successfully!');
      fetchPapers();
      refreshUser();
      setArxivUrl('');
      setShowUploadForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import ArXiv paper');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePaper = async (paperId) => {
    try {
      await papersAPI.delete(paperId);
      toast.success('Paper deleted');
      if (selectedPaper?.id === paperId) {
        setSelectedPaper(null);
      }
      fetchPapers();
    } catch (error) {
      toast.error('Failed to delete paper');
    }
  };

  const handleGeneratePaperSummary = async (paperId) => {
    setIsGenerating(true);
    try {
      const response = await aiAPI.summarizePaper(paperId);
      toast.success('Summary generated!');
      fetchPapers();
      // Find and select the updated paper
      const updatedPaper = papers.find(p => p.id === paperId);
      if (updatedPaper) {
        setSelectedPaper({ ...updatedPaper, ...response.data });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  // ===========================================
  // Summaries Functions
  // ===========================================
  const fetchSummaries = async () => {
    try {
      const response = await summariesAPI.list();
      const data = response.data;
      // Handle various response formats
      if (Array.isArray(data)) {
        setSummaries(data);
      } else if (data?.items && Array.isArray(data.items)) {
        setSummaries(data.items);
      } else if (data?.summaries && Array.isArray(data.summaries)) {
        setSummaries(data.summaries);
      } else {
        setSummaries([]);
      }
    } catch (error) {
      console.error('Failed to load summaries:', error);
      setSummaries([]);
      toast.error('Failed to load summaries');
    }
  };

  const handleDeleteSummary = async (id) => {
    try {
      await summariesAPI.delete(id);
      toast.success('Summary deleted');
      if (selectedSummary?.id === id) {
        setSelectedSummary(null);
      }
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to delete summary');
    }
  };

  // ===========================================
  // Search Functions
  // ===========================================
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchAPI.semantic(searchQuery, 10);
      const data = response.data;
      // Handle various response formats
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data?.results && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
      if (searchResults.length === 0) {
        toast.info('No results found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: 'secondary', icon: Clock, text: 'Pending' },
      processing: { variant: 'default', icon: RefreshCw, text: 'Processing' },
      completed: { variant: 'success', icon: CheckCircle, text: 'Completed' },
      failed: { variant: 'destructive', icon: AlertCircle, text: 'Failed' }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-scholarly-dark relative">
      {/* Background Grid Pattern */}
      <div className="bg-grid-pattern" />
      
      {/* Noise Texture */}
      <div className="noise-texture" />
      
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-ink-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 bg-ink-900/80 backdrop-blur-xl border-b border-ink-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ink-800 border border-ink-700 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-paper-warm">Study Assistant</h1>
                <p className="text-sm text-ink-400 font-mono">Welcome, {user?.full_name || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-xs">
                {user?.tier?.toUpperCase() || 'FREE'} TIER
              </Badge>
              <Button 
                onClick={handleLogout} 
                variant="ghost"
                className="gap-2 text-ink-300 hover:text-paper-warm hover:bg-ink-800"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-ink-800/50 border border-ink-700/50 p-1 backdrop-blur">
            <TabsTrigger 
              value="papers" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-ink-900 text-ink-300 font-medium"
            >
              <File className="w-4 h-4 mr-2" />
              Papers
            </TabsTrigger>
            <TabsTrigger 
              value="search" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-ink-900 text-ink-300 font-medium"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger 
              value="summaries" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-ink-900 text-ink-300 font-medium"
            >
              <FileText className="w-4 h-4 mr-2" />
              Summaries
            </TabsTrigger>
          </TabsList>

          {/* Papers Tab */}
          <TabsContent value="papers">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Papers List */}
              <div className="lg:col-span-1">
                <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-paper-warm font-display flex items-center gap-2">
                        <Library className="w-5 h-5 text-amber-400" />
                        My Papers
                      </CardTitle>
                      <Button 
                        size="sm" 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-ink-900"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-320px)]">
                      {papers.length === 0 ? (
                        <div className="p-6 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ink-700/50 flex items-center justify-center">
                            <File className="w-8 h-8 text-ink-500" />
                          </div>
                          <p className="text-ink-400 font-medium">No papers yet</p>
                          <p className="text-sm text-ink-500 mt-1">Upload your first PDF!</p>
                        </div>
                      ) : (
                        papers.map((paper) => (
                          <div key={paper.id}>
                            <div
                              className={`p-4 cursor-pointer hover:bg-ink-700/30 transition-colors ${
                                selectedPaper?.id === paper.id ? 'bg-ink-700/50 border-l-2 border-amber-500' : ''
                              }`}
                              onClick={() => setSelectedPaper(paper)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-paper-warm truncate">{paper.title}</h3>
                                  <p className="text-sm text-ink-400 font-mono mt-1">
                                    {new Date(paper.created_at).toLocaleDateString()}
                                  </p>
                                  <div className="mt-2">
                                    {getStatusBadge(paper.processing_status || 'completed')}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePaper(paper.id);
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Separator className="bg-ink-700/50" />
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                {showUploadForm ? (
                  <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50">
                    <CardHeader>
                      <CardTitle className="text-paper-warm font-display">Upload Paper</CardTitle>
                      <CardDescription className="text-ink-400">
                        Upload a PDF or import from ArXiv
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* File Upload */}
                      <div className="space-y-4">
                        <h3 className="text-paper-warm font-medium flex items-center gap-2">
                          <Upload className="w-4 h-4 text-amber-400" />
                          Upload PDF
                        </h3>
                        <div 
                          className="border-2 border-dashed border-ink-600 rounded-xl p-8 text-center hover:border-amber-500/50 hover:bg-ink-700/30 transition-all cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ink-700 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-amber-400" />
                          </div>
                          <p className="text-ink-300 mb-2">Click to upload or drag and drop</p>
                          <p className="text-sm text-ink-500 font-mono">PDF files only (max 10MB)</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                        {isUploading && (
                          <div className="space-y-2">
                            <Progress value={uploadProgress} className="h-2 bg-ink-700" />
                            <p className="text-sm text-ink-400 text-center font-mono">Uploading... {uploadProgress}%</p>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="bg-ink-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-ink-800 px-3 text-ink-500 font-mono">Or</span>
                        </div>
                      </div>

                      {/* ArXiv Import */}
                      <div className="space-y-4">
                        <h3 className="text-paper-warm font-medium flex items-center gap-2">
                          <Link className="w-4 h-4 text-amber-400" />
                          Import from ArXiv
                        </h3>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://arxiv.org/abs/2301.00001"
                            value={arxivUrl}
                            onChange={(e) => setArxivUrl(e.target.value)}
                            className="bg-ink-700/50 border-ink-600 text-paper-warm placeholder:text-ink-500 focus:border-amber-500 focus:ring-amber-500/20"
                          />
                          <Button 
                            onClick={handleArxivUpload}
                            disabled={isUploading}
                            className="bg-amber-500 hover:bg-amber-600 text-ink-900"
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => setShowUploadForm(false)}
                        className="w-full text-ink-300 border-ink-600 hover:bg-ink-700 hover:text-paper-warm"
                      >
                        Cancel
                      </Button>
                    </CardContent>
                  </Card>
                ) : selectedPaper ? (
                  <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-paper-warm font-display">{selectedPaper.title}</CardTitle>
                          <CardDescription className="text-ink-400 font-mono">
                            {selectedPaper.authors?.join(', ') || 'Unknown authors'}
                          </CardDescription>
                        </div>
                        {selectedPaper.arxiv_id && (
                          <a 
                            href={`https://arxiv.org/abs/${selectedPaper.arxiv_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300 p-2 rounded-lg hover:bg-ink-700"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedPaper.abstract && (
                        <div>
                          <h3 className="text-paper-warm font-medium mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-400" />
                            Abstract
                          </h3>
                          <p className="text-ink-300 text-sm leading-relaxed">
                            {selectedPaper.abstract}
                          </p>
                        </div>
                      )}

                      {selectedPaper.summary ? (
                        <div>
                          <h3 className="text-paper-warm font-medium mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            AI Summary
                          </h3>
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-ink-200 text-sm leading-relaxed whitespace-pre-wrap">
                              {selectedPaper.summary.generative_summary || selectedPaper.summary.extractive_summary}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-ink-700/30 rounded-xl border border-ink-600/50">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ink-700 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-amber-400/50" />
                          </div>
                          <p className="text-ink-400 mb-4">No AI summary yet</p>
                          <Button
                            onClick={() => handleGeneratePaperSummary(selectedPaper.id)}
                            disabled={isGenerating}
                            className="bg-amber-500 hover:bg-amber-600 text-ink-900 glow-amber"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Summary
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {selectedPaper.key_concepts && selectedPaper.key_concepts.length > 0 && (
                        <div>
                          <h3 className="text-paper-warm font-medium mb-3 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-amber-400" />
                            Key Concepts
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedPaper.key_concepts.map((concept, i) => (
                              <Badge key={i} className="bg-ink-700 text-amber-300 border border-ink-600">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50 h-[calc(100vh-320px)] flex items-center justify-center">
                    <CardContent className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-ink-700/50 flex items-center justify-center">
                        <File className="w-12 h-12 text-ink-500" />
                      </div>
                      <h3 className="text-xl font-display font-semibold text-paper-warm mb-2">No Paper Selected</h3>
                      <p className="text-ink-400 mb-6">Select a paper or upload a new one</p>
                      <Button 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-ink-900 glow-amber"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Your First Paper
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50">
              <CardHeader>
                <CardTitle className="text-paper-warm font-display flex items-center gap-2">
                  <Search className="w-5 h-5 text-amber-400" />
                  Semantic Search
                </CardTitle>
                <CardDescription className="text-ink-400">
                  Search across all your papers using natural language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., papers about transformer architectures..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-ink-700/50 border-ink-600 text-paper-warm placeholder:text-ink-500 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-amber-500 hover:bg-amber-600 text-ink-900 px-6"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-paper-warm font-medium font-mono text-sm">
                      RESULTS ({searchResults.length})
                    </h3>
                    {searchResults.map((result, i) => (
                      <Card key={i} className="bg-ink-700/30 border-ink-600/50 hover:border-amber-500/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="text-paper-warm font-medium">{result.paper?.title || 'Untitled'}</h4>
                              <p className="text-ink-300 text-sm mt-2 line-clamp-3">
                                {result.chunk_text}
                              </p>
                              <Badge className="mt-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-xs">
                                {(result.similarity * 100).toFixed(1)}% match
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-ink-700/50 flex items-center justify-center">
                      <Search className="w-10 h-10 text-ink-500" />
                    </div>
                    <p className="text-ink-400">Enter a query to search your papers</p>
                    <p className="text-ink-500 text-sm mt-1">Use natural language to find relevant passages</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summaries Tab */}
          <TabsContent value="summaries">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Summaries List */}
              <div className="lg:col-span-1">
                <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50">
                  <CardHeader>
                    <CardTitle className="text-paper-warm font-display flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      Paper Summaries
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-320px)]">
                      {summaries.length === 0 ? (
                        <div className="p-6 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ink-700/50 flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-ink-500" />
                          </div>
                          <p className="text-ink-400 font-medium">No summaries yet</p>
                          <p className="text-sm text-ink-500 mt-1">Generate summaries from your papers!</p>
                        </div>
                      ) : (
                        summaries.map((summary) => (
                          <div key={summary.id}>
                            <div
                              className={`p-4 cursor-pointer hover:bg-ink-700/30 transition-colors ${
                                selectedSummary?.id === summary.id ? 'bg-ink-700/50 border-l-2 border-amber-500' : ''
                              }`}
                              onClick={() => setSelectedSummary(summary)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-paper-warm truncate">
                                    {summary.paper?.title || 'Summary'}
                                  </h3>
                                  <p className="text-sm text-ink-400 font-mono mt-1">
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
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Separator className="bg-ink-700/50" />
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Detail */}
              <div className="lg:col-span-2">
                {selectedSummary ? (
                  <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50">
                    <CardHeader>
                      <CardTitle className="text-paper-warm font-display flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        {selectedSummary.paper?.title || 'Summary'}
                      </CardTitle>
                      <CardDescription className="text-ink-400 font-mono">
                        Generated on {new Date(selectedSummary.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedSummary.generative_summary && (
                        <div>
                          <h3 className="text-paper-warm font-medium mb-3 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-amber-400" />
                            AI Summary
                          </h3>
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-ink-200 whitespace-pre-wrap leading-relaxed">
                              {selectedSummary.generative_summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedSummary.extractive_summary && (
                        <div>
                          <h3 className="text-paper-warm font-medium mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-400" />
                            Key Excerpts
                          </h3>
                          <div className="bg-ink-700/30 border border-ink-600/50 rounded-xl p-4">
                            <p className="text-ink-200 whitespace-pre-wrap leading-relaxed">
                              {selectedSummary.extractive_summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedSummary.key_concepts && selectedSummary.key_concepts.length > 0 && (
                        <div>
                          <h3 className="text-paper-warm font-medium mb-3">Key Concepts</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.key_concepts.map((concept, i) => (
                              <Badge key={i} className="bg-ink-700 text-amber-300 border border-ink-600">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-ink-800/50 backdrop-blur border-ink-700/50 h-[calc(100vh-320px)] flex items-center justify-center">
                    <CardContent className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-ink-700/50 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-ink-500" />
                      </div>
                      <h3 className="text-xl font-display font-semibold text-paper-warm mb-2">No Summary Selected</h3>
                      <p className="text-ink-400">Select a summary from the list</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;