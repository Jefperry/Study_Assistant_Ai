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
  Brain, LogOut, Plus, FileText, Trash2, BookOpen, Loader2, 
  Upload, Search, File, Link, ExternalLink, Sparkles, 
  AlertCircle, CheckCircle, Clock, RefreshCw
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">StudyAI</h1>
                <p className="text-sm text-white/70">Welcome, {user?.full_name || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-white/70 border-white/30">
                {user?.tier || 'free'} tier
              </Badge>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="gap-2 text-white border-white/30 hover:bg-white/10"
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
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 p-1">
            <TabsTrigger value="papers" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <File className="w-4 h-4 mr-2" />
              Papers
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="summaries" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <FileText className="w-4 h-4 mr-2" />
              Summaries
            </TabsTrigger>
          </TabsList>

          {/* Papers Tab */}
          <TabsContent value="papers">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Papers List */}
              <div className="lg:col-span-1">
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">My Papers</CardTitle>
                      <Button 
                        size="sm" 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-320px)]">
                      {papers.length === 0 ? (
                        <div className="p-6 text-center text-white/50">
                          <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No papers yet</p>
                          <p className="text-sm">Upload your first PDF!</p>
                        </div>
                      ) : (
                        papers.map((paper) => (
                          <div key={paper.id}>
                            <div
                              className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${
                                selectedPaper?.id === paper.id ? 'bg-white/10 border-l-4 border-purple-500' : ''
                              }`}
                              onClick={() => setSelectedPaper(paper)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-white truncate">{paper.title}</h3>
                                  <p className="text-sm text-white/50 mt-1">
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
                            <Separator className="bg-white/10" />
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
                  <Card className="bg-white/10 backdrop-blur border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">Upload Paper</CardTitle>
                      <CardDescription className="text-white/70">
                        Upload a PDF or import from ArXiv
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* File Upload */}
                      <div className="space-y-4">
                        <h3 className="text-white font-medium">Upload PDF</h3>
                        <div 
                          className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-12 h-12 mx-auto mb-4 text-white/50" />
                          <p className="text-white/70 mb-2">Click to upload or drag and drop</p>
                          <p className="text-sm text-white/50">PDF files only (max 10MB)</p>
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
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-sm text-white/50 text-center">Uploading... {uploadProgress}%</p>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="bg-white/20" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-transparent px-2 text-white/50">Or</span>
                        </div>
                      </div>

                      {/* ArXiv Import */}
                      <div className="space-y-4">
                        <h3 className="text-white font-medium flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Import from ArXiv
                        </h3>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://arxiv.org/abs/2301.00001"
                            value={arxivUrl}
                            onChange={(e) => setArxivUrl(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          />
                          <Button 
                            onClick={handleArxivUpload}
                            disabled={isUploading}
                            className="bg-gradient-to-r from-purple-500 to-pink-500"
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => setShowUploadForm(false)}
                        className="w-full text-white border-white/30 hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                    </CardContent>
                  </Card>
                ) : selectedPaper ? (
                  <Card className="bg-white/10 backdrop-blur border-white/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white">{selectedPaper.title}</CardTitle>
                          <CardDescription className="text-white/70">
                            {selectedPaper.authors?.join(', ') || 'Unknown authors'}
                          </CardDescription>
                        </div>
                        {selectedPaper.arxiv_id && (
                          <a 
                            href={`https://arxiv.org/abs/${selectedPaper.arxiv_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedPaper.abstract && (
                        <div>
                          <h3 className="text-white font-medium mb-2">Abstract</h3>
                          <p className="text-white/70 text-sm leading-relaxed">
                            {selectedPaper.abstract}
                          </p>
                        </div>
                      )}

                      {selectedPaper.summary ? (
                        <div>
                          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            AI Summary
                          </h3>
                          <div className="bg-purple-500/20 rounded-lg p-4">
                            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                              {selectedPaper.summary.generative_summary || selectedPaper.summary.extractive_summary}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-400/50" />
                          <p className="text-white/50 mb-4">No AI summary yet</p>
                          <Button
                            onClick={() => handleGeneratePaperSummary(selectedPaper.id)}
                            disabled={isGenerating}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
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
                          <h3 className="text-white font-medium mb-2">Key Concepts</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedPaper.key_concepts.map((concept, i) => (
                              <Badge key={i} variant="secondary" className="bg-purple-500/30 text-purple-200">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white/10 backdrop-blur border-white/20 h-[calc(100vh-320px)] flex items-center justify-center">
                    <CardContent className="text-center">
                      <File className="w-20 h-20 mx-auto mb-4 text-white/30" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Paper Selected</h3>
                      <p className="text-white/50 mb-6">Select a paper or upload a new one</p>
                      <Button 
                        onClick={() => setShowUploadForm(true)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500"
                      >
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
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Semantic Search</CardTitle>
                <CardDescription className="text-white/70">
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
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-medium">Results ({searchResults.length})</h3>
                    {searchResults.map((result, i) => (
                      <Card key={i} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{result.paper?.title || 'Untitled'}</h4>
                              <p className="text-white/70 text-sm mt-2 line-clamp-3">
                                {result.chunk_text}
                              </p>
                              <Badge variant="outline" className="mt-2 text-purple-300 border-purple-500/50">
                                Similarity: {(result.similarity * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto mb-4 text-white/30" />
                    <p className="text-white/50">Enter a query to search your papers</p>
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
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Paper Summaries</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-320px)]">
                      {summaries.length === 0 ? (
                        <div className="p-6 text-center text-white/50">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No summaries yet</p>
                          <p className="text-sm">Generate summaries from your papers!</p>
                        </div>
                      ) : (
                        summaries.map((summary) => (
                          <div key={summary.id}>
                            <div
                              className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${
                                selectedSummary?.id === summary.id ? 'bg-white/10 border-l-4 border-purple-500' : ''
                              }`}
                              onClick={() => setSelectedSummary(summary)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-white truncate">
                                    {summary.paper?.title || 'Summary'}
                                  </h3>
                                  <p className="text-sm text-white/50 mt-1">
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
                            <Separator className="bg-white/10" />
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
                  <Card className="bg-white/10 backdrop-blur border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        {selectedSummary.paper?.title || 'Summary'}
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Generated on {new Date(selectedSummary.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedSummary.generative_summary && (
                        <div>
                          <h3 className="text-white font-medium mb-2">AI Summary</h3>
                          <div className="bg-purple-500/20 rounded-lg p-4">
                            <p className="text-white/90 whitespace-pre-wrap">
                              {selectedSummary.generative_summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedSummary.extractive_summary && (
                        <div>
                          <h3 className="text-white font-medium mb-2">Key Excerpts</h3>
                          <div className="bg-blue-500/20 rounded-lg p-4">
                            <p className="text-white/90 whitespace-pre-wrap">
                              {selectedSummary.extractive_summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedSummary.key_concepts && selectedSummary.key_concepts.length > 0 && (
                        <div>
                          <h3 className="text-white font-medium mb-2">Key Concepts</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedSummary.key_concepts.map((concept, i) => (
                              <Badge key={i} variant="secondary" className="bg-purple-500/30 text-purple-200">
                                {concept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white/10 backdrop-blur border-white/20 h-[calc(100vh-320px)] flex items-center justify-center">
                    <CardContent className="text-center">
                      <BookOpen className="w-20 h-20 mx-auto mb-4 text-white/30" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Summary Selected</h3>
                      <p className="text-white/50">Select a summary from the list</p>
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