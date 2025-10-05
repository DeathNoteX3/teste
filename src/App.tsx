import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Video, ChecklistItem, PostPublicationChecklistItem, Stage, ChecklistTemplateItem } from './types';
import DraftEditor from './components/DraftEditor';
import VideoCard from './components/VideoCard';
import DraftCard from './components/DraftCard';
import Toast from './components/Toast';
import ThumbPreview from './components/ThumbPreview';
import VideoDetailModal from './components/VideoDetailModal';
import ChecklistManager from './components/ChecklistManager';
import Logo from './components/icons/Logo';
import VideoIcon from './components/icons/VideoIcon';
import BellIcon from './components/icons/BellIcon';
import GearIcon from './components/icons/GearIcon';
import SunIcon from './components/icons/SunIcon';
import MoonIcon from './components/icons/MoonIcon';
import ClipboardCheckIcon from './components/icons/ClipboardCheckIcon';

const initialStagesConfig: Stage[] = [
  {
    id: 'in_draft',
    name: 'Ideias de Vídeos',
    tasks: [
      { key: 'productType', label: 'Escolher tipo de produto' },
      { key: 'title', label: 'Título' },
      { key: 'selectProducts', label: 'Selecionar produtos' },
      { key: 'affiliateLinks', label: 'Links de afiliados selecionados' },
    ]
  },
  {
    id: 'pre_production',
    name: 'Pré produção',
    tasks: [
      { key: 'productImages', label: 'Salvar imagem dos produtos' },
      { key: 'generateScript', label: 'Gerar roteiro' },
    ]
  },
  {
    id: 'production',
    name: 'Produção',
    tasks: [
      { key: 'cutting', label: 'Corte' },
      { key: 'editing', label: 'Edição' },
      { key: 'chapters', label: 'Capítulos' },
      { key: 'render', label: 'Renderizar' },
    ]
  },
  {
    id: 'pre_posting',
    name: 'Pré postagem',
    tasks: [
      { key: 'tags', label: 'Tags' },
      { key: 'generateDescription', label: 'Gerar descrição' },
      { key: 'thumbnail', label: 'Thumbnail' },
    ]
  }
];

const initialPostPublicationChecklist: PostPublicationChecklistItem[] = [
    { key: 'likePoints', label: 'Adicionar vídeo ao like points', completed: false },
    { key: 'fixedComment', label: 'Colocar no comentário fixado os links dos produtos', completed: false },
];

const App: React.FC = () => {
    const [stagesConfig, setStagesConfig] = useState<Stage[]>(initialStagesConfig);
    const [drafts, setDrafts] = useState<Video[]>([]);
    const [publishedVideos, setPublishedVideos] = useState<Video[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    const saveDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load data from electron-store on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const data: any = await window.electronAPI.loadData();
                
                if (data) {
                    const effectiveStagesConfig = data.stagesConfig || initialStagesConfig;
                    const allTemplateTasks = effectiveStagesConfig.flatMap((stage: Stage) => stage.tasks);

                    const syncChecklists = (videos: Video[]): Video[] => {
                        if (!videos) return [];
                        return videos.map((video: Video) => ({
                            ...video,
                            checklist: allTemplateTasks.map((templateTask: ChecklistTemplateItem) => {
                                const existingItem = video.checklist.find(item => item.key === templateTask.key);
                                return {
                                    key: templateTask.key,
                                    label: templateTask.label,
                                    completed: existingItem?.completed || false,
                                };
                            }),
                            postPublicationChecklist: video.postPublicationChecklist && video.postPublicationChecklist.length > 0 ? video.postPublicationChecklist : initialPostPublicationChecklist,
                        }));
                    };
                    
                    if (data.drafts) setDrafts(syncChecklists(data.drafts));
                    if (data.publishedVideos) setPublishedVideos(syncChecklists(data.publishedVideos));
                    if (data.stagesConfig) setStagesConfig(data.stagesConfig);
                    if (data.theme) setTheme(data.theme);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            }
            setIsDataLoaded(true);
        };

        loadData();
    }, []);

    // Save data to electron-store on state change
    useEffect(() => {
        if (!isDataLoaded) return; 

        if (saveDataTimeoutRef.current) {
            clearTimeout(saveDataTimeoutRef.current);
        }

        saveDataTimeoutRef.current = setTimeout(() => {
            const dataToSave = {
                drafts,
                publishedVideos,
                stagesConfig,
                theme,
            };
            window.electronAPI.saveData(dataToSave);
        }, 1000); // Debounce saves by 1 second

        return () => {
            if (saveDataTimeoutRef.current) {
                clearTimeout(saveDataTimeoutRef.current);
            }
        };
    }, [drafts, publishedVideos, stagesConfig, theme, isDataLoaded]);
  
  const getDraftStage = (draft: Video): string => {
    for (const stage of stagesConfig) {
      const stageTasks = stage.tasks.map(t => t.key);
      const isComplete = stageTasks.every(key =>
        draft.checklist.find(item => item.key === key)?.completed
      );
      if (!isComplete) {
        return stage.name;
      }
    }
    return stagesConfig.length > 0 ? stagesConfig[stagesConfig.length - 1].name : 'Finalizado';
  };

  const [editingDraft, setEditingDraft] = useState<Video | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'drafts' | 'thumbPreview' | 'editor' | 'checklistManager'>('dashboard');
  const [previousView, setPreviousView] = useState<'dashboard' | 'drafts'>('dashboard');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{ message: string; isVisible: boolean }>({
    message: '',
    isVisible: false,
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, isVisible: true });
    setTimeout(() => {
      setToast({ message: '', isVisible: false });
    }, 3000);
  }, []);

  const handlePromoteDraft = useCallback((draft: Video) => {
    const publishedDraft: Video = {
      ...draft,
      postPublicationChecklist: initialPostPublicationChecklist
    };
    setPublishedVideos(prev => [publishedDraft, ...prev]);
    setDrafts(prev => prev.filter(d => d.id !== draft.id));
    showToast('Rascunho promovido para o Dashboard!');
  }, [showToast]);

  const handleUpdateStagesConfig = (newConfig: Stage[]) => {
    const allNewTemplateTasks = newConfig.flatMap(stage => stage.tasks);

    const syncChecklist = (video: Video): Video => {
      const existingItemsMap = new Map(video.checklist.map(item => [item.key, item]));
      const newChecklist: ChecklistItem[] = allNewTemplateTasks.map(templateTask => {
        const existingItem = existingItemsMap.get(templateTask.key);
        return {
          ...(existingItem || { completed: false }), // Preserve existing item properties
          key: templateTask.key,
          label: templateTask.label, // Always update label from template
        };
      });
      return { ...video, checklist: newChecklist };
    };
    
    setDrafts(prev => prev.map(syncChecklist));
    setPublishedVideos(prev => prev.map(syncChecklist));
    setStagesConfig(newConfig);
    showToast('Checklist atualizado com sucesso!');
  };


  useEffect(() => {
    if (!isDataLoaded) return;
    const draftsToPromote = drafts.filter(d => d.checklist.every(item => item.completed));
    if (draftsToPromote.length > 0) {
      draftsToPromote.forEach(draft => {
        handlePromoteDraft(draft);
      });
    }
  }, [drafts, handlePromoteDraft, isDataLoaded]);

  const handleOpenEditor = (draft: Video | null) => {
    if (currentView !== 'editor') {
      setPreviousView(currentView as 'dashboard' | 'drafts');
    }
    setEditingDraft(draft);
    setCurrentView('editor');
    setIsNotificationsOpen(false);
  };
  
  const handleCloseEditor = () => {
    setCurrentView(previousView);
    setEditingDraft(null);
  };
  
  const handleOpenVideoDetail = (video: Video) => {
    setSelectedVideoId(video.id);
  };
  
  const handleCloseVideoDetail = () => {
    setSelectedVideoId(null);
  };

  const handleEditPublishedVideo = (video: Video) => {
    handleCloseVideoDetail();
    handleOpenEditor(video);
  };

  const handleSaveDraft = (draftData: Video) => {
    if (editingDraft) {
      const isPublishedVideo = publishedVideos.some(v => v.id === editingDraft.id);
      
      if (isPublishedVideo) {
        setPublishedVideos(prev => prev.map(v => v.id === editingDraft.id ? { ...draftData, id: v.id } : v));
        showToast('Vídeo atualizado com sucesso!');
      } else {
        setDrafts(prev => prev.map(d => d.id === editingDraft.id ? { ...draftData, id: d.id } : d));
        showToast('Rascunho atualizado com sucesso!');
      }
    } else {
      setDrafts(prev => [{ ...draftData, id: new Date().toISOString() }, ...prev]);
      showToast('Rascunho adicionado com sucesso!');
    }
    handleCloseEditor();
  };

  const handleDeleteFromEditor = (itemId: string) => {
    const isActuallyDraft = drafts.some(d => d.id === itemId);

    if (isActuallyDraft) {
        setDrafts(prev => prev.filter(d => d.id !== itemId));
        showToast('Rascunho removido.');
    } else {
        setPublishedVideos(prev => prev.filter(v => v.id !== itemId));
        showToast('Vídeo removido.');
    }
    handleCloseEditor();
  };
  
  const handleDeleteVideo = (videoId: string) => {
    setPublishedVideos(prev => prev.filter(v => v.id !== videoId));
    showToast('Vídeo removido.');
    if (selectedVideoId && selectedVideoId === videoId) {
        handleCloseVideoDetail();
    }
  };

  const handleUpdatePostPublicationChecklist = (videoId: string, newChecklist: PostPublicationChecklistItem[]) => {
    setPublishedVideos(prev =>
      prev.map(video =>
        video.id === videoId
          ? { ...video, postPublicationChecklist: newChecklist }
          : video
      )
    );
  };

  const overdueDrafts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return drafts.filter(d => d.postDate && new Date(d.postDate + 'T00:00:00') < today);
  }, [drafts]);

    const handleExportBackup = async () => {
        setIsSettingsOpen(false);
        const dataToExport = { drafts, publishedVideos, stagesConfig, theme };

        try {
            const result = await window.electronAPI.exportBackup(dataToExport);
            if (result.success) {
                showToast('Backup exportado com sucesso!');
            } else if (result.error && result.error !== 'Export cancelled') {
                showToast(`Falha ao exportar backup: ${result.error}`);
                console.error('Export error:', result.error);
            }
        } catch (error) {
            showToast('Falha ao exportar backup.');
            console.error('Export error:', error);
        }
    };

    const handleImportBackup = async () => {
        setIsSettingsOpen(false);
        try {
            const result = await window.electronAPI.importBackup();
            if (result.success && result.data) {
                const { drafts: importedDrafts, publishedVideos: importedPublished, stagesConfig: importedStagesConfig, theme: importedTheme } = result.data;
                if (Array.isArray(importedDrafts) && Array.isArray(importedPublished)) {
                    setDrafts(importedDrafts);
                    setPublishedVideos(importedPublished);
                    if (importedStagesConfig) {
                        setStagesConfig(importedStagesConfig);
                    }
                    if (importedTheme) {
                        setTheme(importedTheme);
                    }
                    showToast('Backup importado com sucesso!');
                } else {
                    throw new Error("Invalid backup file structure.");
                }
            } else if (result.error && result.error !== 'Import cancelled') {
                showToast(`Erro ao importar: ${result.error}`);
                console.error('Import error:', result.error);
            }
        } catch (error) {
            showToast('Erro: Arquivo de backup inválido ou corrompido.');
            console.error('Import error:', error);
        }
    };
  
  const filteredPublishedVideos = useMemo(() => {
    if (!searchQuery) return publishedVideos;
    return publishedVideos.filter(video => video.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, publishedVideos]);
  
  const filteredDrafts = useMemo(() => {
    const sorted = [...drafts].sort((a, b) => {
      const aHasDate = a.postDate && a.postDate.trim() !== '';
      const bHasDate = b.postDate && b.postDate.trim() !== '';

      if (aHasDate && bHasDate) {
        return new Date(a.postDate).getTime() - new Date(b.postDate).getTime();
      }
      if (aHasDate) {
        return -1;
      }
      if (bHasDate) {
        return 1;
      }
      return b.id.localeCompare(a.id);
    });

    if (!searchQuery) return sorted;
    
    return sorted.filter(draft => draft.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, drafts]);

  const defaultPostDateForNewDraft = useMemo(() => {
    const draftsWithDate = drafts.filter(d => d.postDate && d.postDate.trim() !== '');
    if (draftsWithDate.length > 0) {
        const latestDateStr = draftsWithDate.reduce((latest, draft) => {
            return new Date(draft.postDate!) > new Date(latest) ? draft.postDate! : latest;
        }, '1970-01-01');
        
        const nextDate = new Date(latestDateStr + 'T00:00:00');
        nextDate.setDate(nextDate.getDate() + 1);
        return nextDate.toISOString().split('T')[0];
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, [drafts]);

  const nextVideoNumber = useMemo(() => {
    const maxNumberInDrafts = drafts.reduce((max, video) => {
        if (video.videoNumber && video.videoNumber > max) {
            return video.videoNumber;
        }
        return max;
    }, 0);
    return maxNumberInDrafts > 0 ? maxNumberInDrafts + 1 : 1;
  }, [drafts]);

  const isEditingPublishedVideo = useMemo(() => {
    if (!editingDraft?.id) return false;
    return publishedVideos.some(v => v.id === editingDraft.id);
  }, [editingDraft, publishedVideos]);

  const renderDashboardContent = () => {
    if (!isDataLoaded) {
      return (
        <div className="text-center py-20">
          <h2 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-yt-text-primary">Carregando dados...</h2>
        </div>
      );
    }

    if (currentView === 'dashboard') {
      return (
        <>
          {filteredPublishedVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {filteredPublishedVideos.map(video => (
                <VideoCard key={video.id} video={video} onClick={handleOpenVideoDetail} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24 text-gray-400 dark:text-yt-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <h2 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-yt-text-primary">Nenhum Vídeo Publicado</h2>
              <p className="mt-2 text-gray-500 dark:text-yt-text-secondary">{searchQuery ? 'Tente uma busca diferente.' : 'Mova um rascunho completo para o dashboard.'}</p>
            </div>
          )}
        </>
      );
    }

    if (currentView === 'drafts') {
      const draftsByStage = filteredDrafts.reduce((acc, draft) => {
        const stage = getDraftStage(draft);
        if (!acc[stage]) {
          acc[stage] = [];
        }
        acc[stage].push(draft);
        return acc;
      }, {} as Record<string, Video[]>);

      const stageOrder = stagesConfig.map(s => s.name);
      const hasAnyDrafts = filteredDrafts.length > 0;

       return (
        <>
          {hasAnyDrafts ? (
            <div className="space-y-12">
              {stageOrder.map(stageName => {
                const stageDrafts = draftsByStage[stageName];
                if (!stageDrafts || stageDrafts.length === 0) {
                    return null;
                }
                return (
                    <section key={stageName}>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-yt-text-primary tracking-tight mb-6">{stageName} ({stageDrafts.length})</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                            {stageDrafts.map(draft => (
                                <DraftCard key={draft.id} draft={draft} onEdit={handleOpenEditor} />
                            ))}
                        </div>
                    </section>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24 text-gray-400 dark:text-yt-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h2 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-yt-text-primary">Nenhum Rascunho</h2>
                <p className="mt-2 text-gray-500 dark:text-yt-text-secondary">{searchQuery ? 'Tente uma busca diferente.' : 'Clique no ícone de vídeo para criar seu primeiro rascunho.'}</p>
            </div>
          )}
        </>
      );
    }
    
    if (currentView === 'thumbPreview') {
      return <ThumbPreview />;
    }

    if (currentView === 'checklistManager') {
        return <ChecklistManager stagesConfig={stagesConfig} onUpdate={handleUpdateStagesConfig} />;
    }

    return null;
  };

  const selectedVideo = publishedVideos.find(v => v.id === selectedVideoId) || null;

  return (
    <div className="min-h-screen text-gray-800 dark:text-yt-text-primary font-sans">
        <Toast message={toast.message} isVisible={toast.isVisible} />
        <div className="bg-white dark:bg-yt-black flex w-full min-h-screen">
            <aside className="w-60 flex-shrink-0 p-4 border-r border-gray-200/80 dark:border-yt-light-gray/50">
                <div className="px-3 mb-8 mt-1">
                    <Logo />
                </div>
                <nav className="space-y-1">
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }} className={`flex items-center gap-4 p-3 rounded-lg font-medium transition-colors ${currentView === 'dashboard' ? 'bg-gray-100 dark:bg-yt-dark-gray text-gray-900 dark:text-yt-text-primary' : 'text-gray-600 dark:text-yt-text-secondary hover:bg-gray-100 dark:hover:bg-yt-dark-gray hover:text-gray-800 dark:hover:text-yt-text-primary'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('drafts'); }} className={`flex items-center gap-4 p-3 rounded-lg font-medium transition-colors ${currentView === 'drafts' ? 'bg-gray-100 dark:bg-yt-dark-gray text-gray-900 dark:text-yt-text-primary' : 'text-gray-600 dark:text-yt-text-secondary hover:bg-gray-100 dark:hover:bg-yt-dark-gray hover:text-gray-800 dark:hover:text-yt-text-primary'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rascunhos
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('thumbPreview'); }} className={`flex items-center gap-4 p-3 rounded-lg font-medium transition-colors ${currentView === 'thumbPreview' ? 'bg-gray-100 dark:bg-yt-dark-gray text-gray-900 dark:text-yt-text-primary' : 'text-gray-600 dark:text-yt-text-secondary hover:bg-gray-100 dark:hover:bg-yt-dark-gray hover:text-gray-800 dark:hover:text-yt-text-primary'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Thumb Preview
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('checklistManager'); }} className={`flex items-center gap-4 p-3 rounded-lg font-medium transition-colors ${currentView === 'checklistManager' ? 'bg-gray-100 dark:bg-yt-dark-gray text-gray-900 dark:text-yt-text-primary' : 'text-gray-600 dark:text-yt-text-secondary hover:bg-gray-100 dark:hover:bg-yt-dark-gray hover:text-gray-800 dark:hover:text-yt-text-primary'}`}>
                    <ClipboardCheckIcon className="h-6 w-6" />
                    Gerenciar Checklist
                </a>
                </nav>
            </aside>
            
            <div className="flex-1 flex flex-col max-h-screen">
                <header className="py-3 px-8 flex justify-between items-center border-b border-gray-200/80 dark:border-yt-light-gray/50 flex-shrink-0">
                    <div className="flex-1 flex justify-center px-8">
                        <div className="relative w-full max-w-xl">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-yt-dark-gray border border-gray-200 dark:border-yt-light-gray rounded-full py-2.5 pl-10 pr-4 text-gray-800 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-yt-light-gray"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-yt-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentView !== 'thumbPreview' && currentView !== 'editor' && currentView !== 'checklistManager' && (
                        <button onClick={() => handleOpenEditor(null)} title="Adicionar Vídeo" className="flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-yt-dark-gray text-gray-600 dark:text-yt-text-secondary p-2.5 rounded-full transition-colors">
                            <VideoIcon className="h-6 w-6" />
                        </button>
                        )}
                         <div className="relative" ref={notificationsRef}>
                            <button onClick={() => setIsNotificationsOpen(prev => !prev)} title="Notificações" className="relative flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-yt-dark-gray text-gray-600 dark:text-yt-text-secondary p-2.5 rounded-full transition-colors">
                                <BellIcon className="h-6 w-6" />
                                {overdueDrafts.length > 0 && (
                                    <span className="absolute top-1 right-1 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center border-2 border-white dark:border-yt-black">{overdueDrafts.length}</span>
                                )}
                            </button>
                            {isNotificationsOpen && (
                                <div className="absolute top-12 right-0 z-20 w-80 bg-white dark:bg-yt-dark-gray rounded-lg shadow-2xl border border-gray-200 dark:border-yt-light-gray overflow-hidden">
                                    <div className="p-4 border-b border-gray-200 dark:border-yt-light-gray">
                                        <h3 className="font-semibold text-gray-800 dark:text-yt-text-primary">Notificações</h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {overdueDrafts.length > 0 ? (
                                            <ul>
                                                {overdueDrafts.map(draft => (
                                                    <li key={draft.id} className="border-b border-gray-100 dark:border-yt-light-gray/50 last:border-b-0">
                                                        <a href="#" onClick={(e) => { e.preventDefault(); handleOpenEditor(draft); }} className="block p-4 hover:bg-gray-50 dark:hover:bg-yt-light-gray/50 transition-colors">
                                                            <p className="font-semibold text-sm text-gray-800 dark:text-yt-text-primary truncate">{draft.title}</p>
                                                            <p className="text-xs text-red-500 dark:text-red-400">Este rascunho está atrasado. A data de postagem era {new Date(draft.postDate + 'T00:00:00').toLocaleDateString('pt-BR')}.</p>
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="p-4 text-sm text-gray-500 dark:text-yt-text-secondary">Nenhuma notificação nova.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                         </div>
                         <div className="relative" ref={settingsRef}>
                            <button onClick={() => setIsSettingsOpen(prev => !prev)} title="Configurações" className="flex items-center justify-center bg-transparent hover:bg-gray-100 dark:hover:bg-yt-dark-gray text-gray-600 dark:text-yt-text-secondary p-2.5 rounded-full transition-colors">
                                <GearIcon className="h-6 w-6" />
                            </button>
                            {isSettingsOpen && (
                                <div className="absolute top-12 right-0 z-20 w-64 bg-white dark:bg-yt-dark-gray rounded-lg shadow-2xl border border-gray-200 dark:border-yt-light-gray py-2">
                                    <button onClick={handleExportBackup} className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-yt-text-primary hover:bg-gray-100 dark:hover:bg-yt-light-gray">Exportar Backup (JSON)</button>
                                    <button onClick={handleImportBackup} className="w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-yt-text-primary hover:bg-gray-100 dark:hover:bg-yt-light-gray">Importar Backup (JSON)</button>
                                    <div className="border-t border-gray-200 dark:border-yt-light-gray my-2"></div>
                                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-yt-text-secondary">Tema</div>
                                    <div className="px-2">
                                        <div className="flex items-center gap-2 p-2 rounded-lg">
                                            <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm ${theme === 'light' ? 'bg-gray-200 dark:bg-yt-light-gray' : 'hover:bg-gray-100 dark:hover:bg-yt-light-gray/50'}`}>
                                                <SunIcon className="h-5 w-5" /> Claro
                                            </button>
                                            <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm ${theme === 'dark' ? 'bg-gray-200 dark:bg-yt-light-gray' : 'hover:bg-gray-100 dark:hover:bg-yt-light-gray/50'}`}>
                                                <MoonIcon className="h-5 w-5" /> Escuro
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                         </div>
                    </div>
                </header>

                {currentView === 'editor' ? (
                    <DraftEditor
                        onCancel={handleCloseEditor}
                        onSaveDraft={handleSaveDraft}
                        onDeleteDraft={handleDeleteFromEditor}
                        onCopy={showToast}
                        draftToEdit={editingDraft}
                        defaultPostDate={defaultPostDateForNewDraft}
                        defaultVideoNumber={nextVideoNumber}
                        isPublished={isEditingPublishedVideo}
                        stagesConfig={stagesConfig}
                    />
                ) : (
                    <main className="flex-1 overflow-y-auto p-8 bg-gray-50/50 dark:bg-yt-black">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-yt-text-primary tracking-tight mb-8">
                            {currentView === 'dashboard' ? 'Dashboard' : 
                            currentView === 'drafts' ? `Rascunhos (${filteredDrafts.length})` :
                            currentView === 'checklistManager' ? 'Gerenciar Checklist' :
                            'Thumb Preview'}
                        </h1>
                        {renderDashboardContent()}
                    </main>
                )}
            </div>
            
            <VideoDetailModal
                isOpen={!!selectedVideoId}
                onClose={handleCloseVideoDetail}
                video={selectedVideo}
                onCopy={showToast}
                onDelete={handleDeleteVideo}
                onUpdateChecklist={handleUpdatePostPublicationChecklist}
                onEdit={handleEditPublishedVideo}
            />
        </div>
    </div>
  );
};

export default App;