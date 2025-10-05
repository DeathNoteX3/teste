import React, { useState, useEffect, useRef } from 'react';
import { Video, ThumbnailSource, Product, StoreLink, ChecklistItem, Stage } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CopyIcon from './icons/CopyIcon';

interface DraftEditorProps {
  onCancel: () => void;
  onSaveDraft: (video: Video) => void;
  onDeleteDraft: (draftId: string) => void;
  onCopy: (message: string) => void;
  draftToEdit: Video | null;
  defaultPostDate: string;
  defaultVideoNumber?: number;
  isPublished: boolean;
  stagesConfig: Stage[];
}

const createEmptyProduct = (): Product => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: `prod-${uniqueId}`,
      name: '',
      stores: [
        { id: `store-${uniqueId}-1`, name: 'CASAS BAHIA', isNotBivolt: false, url: '', url110v: '', url220v: '' },
        { id: `store-${uniqueId}-2`, name: 'MERCADO LIVRE', isNotBivolt: false, url: '', url110v: '', url220v: '' },
        { id: `store-${uniqueId}-3`, name: 'AMAZON', isNotBivolt: false, url: '', url110v: '', url220v: '' },
      ],
    };
};

const createNewDraft = (stagesConfig: Stage[], defaultPostDate?: string, defaultVideoNumber?: number): Video => {
    const initialProducts = Array.from({ length: 5 }, () => createEmptyProduct());
    const checklist: ChecklistItem[] = stagesConfig.flatMap(stage => 
        stage.tasks.map(task => ({
            key: task.key,
            label: task.label,
            completed: false
        }))
    );
    
    return {
        id: '',
        title: `${initialProducts.length} `,
        description: '',
        tags: '',
        script: '',
        thumbnail: '',
        products: initialProducts,
        postDate: defaultPostDate || '',
        chapters: '',
        videoNumber: defaultVideoNumber,
        checklist,
    };
};

const DraftEditor: React.FC<DraftEditorProps> = ({ onCancel, onSaveDraft, onDeleteDraft, onCopy, draftToEdit, defaultPostDate, defaultVideoNumber, isPublished, stagesConfig }) => {
  const [draft, setDraft] = useState<Video>(createNewDraft(stagesConfig));
  const [thumbSource, setThumbSource] = useState<ThumbnailSource>(ThumbnailSource.URL);
  const [expandedProductIndex, setExpandedProductIndex] = useState<number | null>(null);
  
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const scriptRef = useRef<HTMLTextAreaElement>(null);
  const chaptersRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevProductCountRef = useRef<number | undefined>(undefined);
 
  const isEditing = !!draftToEdit;

  const autosizeTextarea = (element: HTMLTextAreaElement | null) => {
    if (element) {
        element.style.height = 'auto'; // Temporarily shrink to get the correct scrollHeight
        element.style.height = `${element.scrollHeight}px`; // Set the new height
    }
  };

  // Unified effect for sizing textareas on load, content change, and window resize
  useEffect(() => {
    const handleSizing = () => {
      autosizeTextarea(descriptionRef.current);
      autosizeTextarea(scriptRef.current);
      autosizeTextarea(chaptersRef.current);
    };

    // A small delay to ensure layout is calculated, especially on initial load.
    const id = setTimeout(handleSizing, 100);
    window.addEventListener('resize', handleSizing);
    
    // Also trigger on content change (dependencies do this)
    handleSizing();

    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', handleSizing);
    };
  }, [draftToEdit, draft.description, draft.script, draft.chapters]);


  useEffect(() => {
      if (draftToEdit) {
        // Use the centrally managed checklist from the draft itself,
        // as it's already been synced by App.tsx
        setDraft(JSON.parse(JSON.stringify(draftToEdit)));
        
        if (draftToEdit.thumbnail.startsWith('data:image')) {
          setThumbSource(ThumbnailSource.UPLOAD);
        } else {
          setThumbSource(ThumbnailSource.URL);
        }
      } else {
        setDraft(createNewDraft(stagesConfig, defaultPostDate, defaultVideoNumber));
        setThumbSource(ThumbnailSource.URL);
      }
  }, [draftToEdit, defaultPostDate, defaultVideoNumber, stagesConfig]);

  useEffect(() => {
    if (!draft) return;
    const currentProductCount = draft.products.length;

    // Only run if the count has actually changed from the last known count,
    // to avoid overriding user's manual title changes unnecessarily.
    if (prevProductCountRef.current !== undefined && prevProductCountRef.current !== currentProductCount) {
      const currentTitle = draft.title;
      // Removes a leading number and any following spaces
      const titleWithoutPrefix = currentTitle.replace(/^\d+\s*/, '');
      let newTitle = titleWithoutPrefix;
      
      if (currentProductCount > 0) {
        newTitle = `${currentProductCount} ${titleWithoutPrefix}`;
      }
      
      // Update draft only if the title has changed
      if (newTitle !== currentTitle) {
        updateDraft('title', newTitle);
      }
    }
    
    // Update the ref for the next render
    prevProductCountRef.current = currentProductCount;
  }, [draft?.products]);


  useEffect(() => {
    if (!draft) return;
    
    const newChecklist = draft.checklist.map(item => {
      let completed = item.completed; 
      switch (item.key) {
        case 'productType': // Kept for backward compatibility if key exists
        case 'title':
          completed = draft.title.trim() !== '';
          break;
        case 'selectProducts':
          completed = draft.products.length > 0 && draft.products.every(p => p.name.trim() !== '');
          break;
        case 'affiliateLinks':
          {
            const isUrlFieldFilled = (url: string) => url.trim().length > 0;

            if (draft.products.length > 0) {
              completed = draft.products.every(product =>
                product.name.trim() !== '' &&
                product.stores.length > 0 &&
                product.stores.every(store => 
                  store.isNotBivolt ?
                  isUrlFieldFilled(store.url110v) && isUrlFieldFilled(store.url220v) :
                  isUrlFieldFilled(store.url)
                )
              );
            } else {
              completed = false;
            }
            break;
          }
        case 'generateDescription': completed = draft.description.trim() !== ''; break;
        case 'tags': completed = draft.tags.trim() !== ''; break;
        case 'thumbnail': completed = draft.thumbnail.trim() !== ''; break;
        case 'generateScript': completed = draft.script.trim() !== ''; break;
        case 'chapters': completed = draft.chapters.trim() !== ''; break;
        // Default case for custom tasks: they are only toggled manually
        default:
          completed = item.completed;
      }
      return { ...item, completed };
    });

    if (JSON.stringify(newChecklist) !== JSON.stringify(draft.checklist)) {
       updateDraft('checklist', newChecklist);
    }
  }, [draft?.title, draft?.description, draft?.tags, draft?.thumbnail, draft?.products, draft?.script, draft?.chapters, draft.checklist]);


  const updateDraft = <K extends keyof Video>(key: K, value: Video[K]) => {
      setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  };
  
  const handleChecklistItemToggle = (key: ChecklistItem['key']) => {
    const newChecklist = draft.checklist.map(item => 
      item.key === key ? { ...item, completed: !item.completed } : item
    );
    updateDraft('checklist', newChecklist);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDraft('thumbnail', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
    const handleRemoveThumbnail = () => {
        updateDraft('thumbnail', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

  const handleAddProduct = () => {
    const newProduct = createEmptyProduct();
    const newProducts = [...draft.products, newProduct];
    setExpandedProductIndex(null); // Do not expand the new product
    updateDraft('products', newProducts);
  };

  const handleRemoveProduct = (prodIndex: number) => {
    const newProducts = draft.products.filter((_: Product, i: number) => i !== prodIndex);
    updateDraft('products', newProducts);
  };
  
  const handleProductChange = (prodIndex: number, field: keyof Product, value: any) => {
    const newProducts = JSON.parse(JSON.stringify(draft.products));
    newProducts[prodIndex][field] = value;
    updateDraft('products', newProducts);
  };

  const handleAddStore = (prodIndex: number) => {
    const newProducts = JSON.parse(JSON.stringify(draft.products));
    newProducts[prodIndex].stores.push({ id: `store-${Date.now()}`, name: '', isNotBivolt: false, url: '', url110v: '', url220v: '' });
    updateDraft('products', newProducts);
  };

  const handleRemoveStore = (prodIndex: number, storeIndex: number) => {
    const newProducts = JSON.parse(JSON.stringify(draft.products));
    newProducts[prodIndex].stores = newProducts[prodIndex].stores.filter((_: StoreLink, i: number) => i !== storeIndex);
    updateDraft('products', newProducts);
  };
  
  const handleStoreChange = (prodIndex: number, storeIndex: number, field: keyof StoreLink, value: any) => {
    const newProducts = JSON.parse(JSON.stringify(draft.products));
    newProducts[prodIndex].stores[storeIndex][field] = value;
    updateDraft('products', newProducts);
  };

   const handleToggleProductBox = (index: number) => {
    setExpandedProductIndex(prevIndex => (prevIndex === index ? null : index));
  };

  const generateSearchUrl = (store: 'mercadoLivre' | 'amazon' | 'casasBahia', productName: string) => {
    if (!productName) return '#';
    const productNameTrimmed = productName.trim();

    switch (store) {
      case 'mercadoLivre': {
        const part1 = productNameTrimmed.toLowerCase().replace(/\s+/g, '-');
        const part2 = encodeURIComponent(productNameTrimmed);
        return `https://lista.mercadolivre.com.br/${part1}#D[A:${part2}]`;
      }
      case 'amazon': {
        const amazonQuery = encodeURIComponent(productNameTrimmed).replace(/%20/g, '+');
        return `https://www.amazon.com.br/s?k=${amazonQuery}&__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91`;
      }
      case 'casasBahia': {
        const casasBahiaQuery = productNameTrimmed.toLowerCase().replace(/\s+/g, '-');
        return `https://www.casasbahia.com.br/${casasBahiaQuery}/b?filter=lojistas-l10037`;
      }
      default:
        return '#';
    }
  };

  const openLink = (url: string) => {
    window.electronAPI.openExternalLink(url);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title) {
        alert("O título é obrigatório.");
        return;
    }
    onSaveDraft(draft);
  };

  const handleDelete = () => {
    const message = isPublished
        ? 'Tem certeza de que deseja excluir este vídeo? Esta ação não pode ser desfeita.'
        : 'Tem certeza de que deseja excluir este rascunho? Esta ação não pode ser desfeita.';

    if (window.confirm(message)) {
        if (draft && draft.id) {
            onDeleteDraft(draft.id);
        }
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds},000`; 
  };

  const handleGenerateSrt = async () => {
      if (!draft || !draft.script.trim()) {
          onCopy("O roteiro está vazio.");
          return;
      }

      const scriptText = draft.script.trim();
      const MAX_LENGTH = 500;
      const chunks: string[] = [];
      let remainingText = scriptText;

      while (remainingText.length > 0) {
          if (remainingText.length <= MAX_LENGTH) {
              chunks.push(remainingText);
              break;
          }

          let potentialChunk = remainingText.substring(0, MAX_LENGTH);
          let lastPeriodIndex = potentialChunk.lastIndexOf('.');

          if (lastPeriodIndex > 0) {
              potentialChunk = remainingText.substring(0, lastPeriodIndex + 1);
          }
          
          chunks.push(potentialChunk.trim());
          remainingText = remainingText.substring(potentialChunk.length).trim();
      }

      let srtContent = '';
      let startTime = 0;
      const DURATION = 30; // 30 seconds per subtitle block

      chunks.forEach((chunk, index) => {
          const endTime = startTime + DURATION;
          srtContent += `${index + 1}\n`;
          srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
          srtContent += `${chunk}\n\n`;
          startTime = endTime;
      });

      try {
          const result = await window.electronAPI.saveSrtFile(srtContent);
          if (result.success) {
              onCopy('Arquivo SRT salvo com sucesso!');
          } else if (result.error && result.error !== 'Save cancelled') {
              onCopy(`Falha ao salvar SRT: ${result.error}`);
              console.error('SRT save error:', result.error);
          }
      } catch (error) {
          onCopy('Falha ao salvar arquivo SRT.');
          console.error('SRT save error:', error);
      }
  };

    const handleCopyTitle = async () => {
        if (draft.title) {
            await window.electronAPI.writeToClipboard(draft.title);
            onCopy('Título copiado!');
        }
    };


  if (!draft) return null;
  
  const tagsCharCount = draft.tags.length;
  const tagsCharLimit = 500;
  const isTagsOverLimit = tagsCharCount > tagsCharLimit;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-yt-black overflow-hidden">
      <form onSubmit={handleSubmit} id="draft-form" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-grow overflow-y-auto p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-yt-text-primary tracking-tight mb-8">
                {isEditing ? 'Editar Item' : 'Adicionar Novo Rascunho'}
            </h1>
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:items-start">
                    <div className="md:col-span-3 space-y-5">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary mb-1">Nome do Vídeo</label>
                            <div className="relative">
                                <button type="button" onClick={handleCopyTitle} title="Copiar Título" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1 text-gray-400 hover:text-gray-600 dark:text-yt-text-secondary dark:hover:text-yt-text-primary rounded-full hover:bg-gray-100 dark:hover:bg-yt-light-gray transition-colors">
                                    <CopyIcon className="h-5 w-5" />
                                </button>
                                <input type="text" id="title" value={draft.title} onChange={e => updateDraft('title', e.target.value)} required placeholder="Ex: Melhor Air Fryer de 2025?" className="block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 pl-10 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="postDate" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary mb-1">Data de Postagem</label>
                                <input type="date" id="postDate" value={draft.postDate} onChange={e => updateDraft('postDate', e.target.value)} className="block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm [color-scheme:dark]" />
                            </div>
                            <div>
                                <label htmlFor="videoNumber" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary mb-1">Numeração do Vídeo</label>
                                <input
                                type="number"
                                id="videoNumber"
                                value={draft.videoNumber ?? ''}
                                onChange={e => updateDraft('videoNumber', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                                placeholder="Ex: 123"
                                className="block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary">Descrição</label>
                            </div>
                            <textarea id="description" rows={4} ref={descriptionRef} value={draft.description} onChange={e => updateDraft('description', e.target.value)} className="block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm resize-none overflow-hidden" />
                        </div>
                    </div>
                    <div className="md:col-span-1 bg-white dark:bg-yt-dark-gray rounded-xl border border-gray-200/80 dark:border-yt-light-gray/60 p-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-yt-text-primary mb-4">Checklist de Progresso</h3>
                        <div className="space-y-4">
                            {stagesConfig.map(stage => (
                                <div key={stage.id}>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-yt-text-secondary mb-3 uppercase tracking-wider">{stage.name}</h4>
                                    <div className="space-y-3">
                                        {draft.checklist
                                            .filter(item => stage.tasks.some(t => t.key === item.key))
                                            .map(item => (
                                                <label key={item.key} htmlFor={`checklist-${item.key}`} className="flex items-center cursor-pointer group">
                                                    <input 
                                                    type="checkbox" 
                                                    id={`checklist-${item.key}`} 
                                                    checked={item.completed}
                                                    onChange={() => handleChecklistItemToggle(item.key)}
                                                    className="h-4 w-4 rounded text-gray-600 dark:text-yt-text-secondary border-gray-300 dark:border-yt-light-gray focus:ring-gray-500 dark:focus:ring-yt-light-gray bg-gray-100 dark:bg-yt-light-gray"
                                                    />
                                                    <span className={`ml-3 text-sm ${item.completed ? 'text-gray-500 dark:text-yt-text-secondary line-through' : 'text-gray-700 dark:text-yt-text-secondary group-hover:text-gray-800 dark:group-hover:text-yt-text-primary'}`}>{item.label}</span>
                                                </label>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
          
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary">Tags (separadas por vírgula)</label>
                        <span className={`text-sm font-medium ${isTagsOverLimit ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-yt-text-secondary'}`}>
                            {tagsCharCount}/{tagsCharLimit}
                        </span>
                    </div>
                    <input 
                        type="text" 
                        id="tags" 
                        value={draft.tags} 
                        onChange={e => updateDraft('tags', e.target.value)} 
                        className={`block w-full bg-white dark:bg-yt-dark-gray border rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 sm:text-sm ${isTagsOverLimit ? 'border-red-500 focus:ring-red-500 dark:border-red-600' : 'border-gray-300 dark:border-yt-light-gray focus:ring-gray-400 dark:focus:ring-yt-light-gray'}`}
                    />
                    {isTagsOverLimit && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                            O limite de caracteres foi excedido.
                        </p>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="script" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary">Roteiro</label>
                    </div>
                    <textarea id="script" ref={scriptRef} value={draft.script} onChange={e => updateDraft('script', e.target.value)} rows={5} className="block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm resize-none overflow-hidden" />
                    <div className="mt-2 flex justify-end">
                        <button 
                            type="button" 
                            onClick={handleGenerateSrt}
                            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-yt-light-gray dark:hover:bg-yt-light-gray/80 text-gray-800 dark:text-yt-text-primary font-semibold rounded-lg shadow-sm transition-colors text-sm"
                        >
                            Gerar SRT
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="chapters" className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary">Capítulos</label>
                    </div>
                    <textarea id="chapters" ref={chaptersRef} value={draft.chapters} onChange={e => updateDraft('chapters', e.target.value)} rows={2} placeholder="0:00 Introdução&#10;1:23 Tópico 1" className="block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm resize-none overflow-hidden" />
                </div>
          
                <div className="border-t border-gray-200 dark:border-yt-light-gray pt-5">
                    <label className="block text-base font-semibold text-gray-800 dark:text-yt-text-primary mb-3">Links de Afiliados</label>
                    <div className="space-y-4">
                    {draft.products.map((product, prodIndex) => {
                       const isExpanded = expandedProductIndex === prodIndex;
                       return (
                        <div key={product.id} className="p-4 bg-white dark:bg-yt-dark-gray rounded-xl border border-gray-200/80 dark:border-yt-light-gray/60 transition-all duration-200">
                            <div className="flex items-start gap-3">
                                <span className="text-sm font-bold text-gray-500 dark:text-yt-text-secondary pt-2.5">#{prodIndex + 1}</span>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        <input type="text" placeholder="Nome do Produto (Marca + Modelo)" value={product.name} onChange={(e) => handleProductChange(prodIndex, 'name', e.target.value)} className="flex-grow block w-full bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-lg py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm font-semibold"/>
                                        <button type="button" onClick={() => handleToggleProductBox(prodIndex)} className="p-2 text-gray-500 dark:text-yt-text-secondary hover:bg-gray-100 dark:hover:bg-yt-dark-gray rounded-full" aria-expanded={isExpanded} aria-controls={`product-details-${product.id}`}>
                                            <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        <button type="button" onClick={() => handleRemoveProduct(prodIndex)} className="p-2 text-gray-500 dark:text-yt-text-secondary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    </div>
                                    
                                {isExpanded && (
                                        <div id={`product-details-${product.id}`} className="mt-3 pt-3 border-t border-gray-200/80 dark:border-yt-light-gray/60 space-y-3">
                                            {product.stores.map((store, storeIndex) => (
                                                <React.Fragment key={store.id}>
                                                {storeIndex > 0 && <div className="border-t border-gray-200/80 dark:border-yt-light-gray/60 my-3"></div>}
                                                <div className="pl-4 border-l-2 border-gray-300 dark:border-yt-light-gray space-y-2">
                                                    <div className="flex items-center gap-2">
                                                    <select 
                                                        value={store.name} 
                                                        onChange={(e) => handleStoreChange(prodIndex, storeIndex, 'name', e.target.value)} 
                                                        className="block w-full bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-lg py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm"
                                                    >
                                                        <option value="" disabled>Selecione uma loja</option>
                                                        <option value="MERCADO LIVRE">Mercado Livre</option>
                                                        <option value="AMAZON">Amazon</option>
                                                        <option value="CASAS BAHIA">Casas Bahia</option>
                                                    </select>
                                                    <button type="button" onClick={() => handleRemoveStore(prodIndex, storeIndex)} className="p-1 text-gray-500 dark:text-yt-text-secondary hover:text-gray-800 dark:hover:text-yt-text-primary hover:bg-gray-200 dark:hover:bg-yt-light-gray rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                    </div>
                                                    <label htmlFor={`bivolt-${store.id}`} className="flex items-center cursor-pointer">
                                                    <input type="checkbox" id={`bivolt-${store.id}`} checked={store.isNotBivolt} onChange={(e) => handleStoreChange(prodIndex, storeIndex, 'isNotBivolt', e.target.checked)} className="h-4 w-4 rounded text-gray-600 dark:text-yt-text-secondary border-gray-300 dark:border-yt-light-gray focus:ring-gray-500 dark:focus:ring-yt-light-gray bg-gray-100 dark:bg-yt-dark-gray" />
                                                    <span className="ml-2 text-sm text-gray-700 dark:text-yt-text-secondary">Não é bivolt (links para 110V/220V)</span>
                                                    </label>
                                                    {store.isNotBivolt ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="text" placeholder="URL 110V ou -" value={store.url110v} onChange={(e) => handleStoreChange(prodIndex, storeIndex, 'url110v', e.target.value)} className="block w-full bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-lg py-2 px-3 text-gray-900 dark:text-yt-text-primary sm:text-sm" />
                                                        <input type="text" placeholder="URL 220V ou -" value={store.url220v} onChange={(e) => handleStoreChange(prodIndex, storeIndex, 'url220v', e.target.value)} className="block w-full bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-lg py-2 px-3 text-gray-900 dark:text-yt-text-primary sm:text-sm" />
                                                    </div>
                                                    ) : ( <input type="text" placeholder="URL do Afiliado ou -" value={store.url} onChange={(e) => handleStoreChange(prodIndex, storeIndex, 'url', e.target.value)} className="block w-full bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-lg py-2 px-3 text-gray-900 dark:text-yt-text-primary sm:text-sm" />)}
                                                </div>
                                                </React.Fragment>
                                            ))}
                                            <button type="button" onClick={() => handleAddStore(prodIndex)} className="w-full text-sm py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-yt-light-gray/50 dark:hover:bg-yt-light-gray text-gray-700 dark:text-yt-text-primary font-semibold rounded-lg border border-gray-300 dark:border-yt-light-gray">+ Adicionar Loja</button>
                                            {product.name.trim() !== '' && (
                                                <div className="pt-3 border-t border-gray-200/80 dark:border-yt-light-gray/60 mt-3">
                                                <h5 className="text-xs font-semibold text-gray-500 dark:text-yt-text-secondary mb-2">Busca Rápida</h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <button type="button" onClick={() => openLink(generateSearchUrl('casasBahia', product.name))} className="w-full text-xs py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors">
                                                    Casas Bahia
                                                    </button>
                                                    <button type="button" onClick={() => openLink(generateSearchUrl('mercadoLivre', product.name))} className="w-full text-xs py-1.5 px-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-md transition-colors">
                                                    Mercado Livre
                                                    </button>
                                                    <button type="button" onClick={() => openLink(generateSearchUrl('amazon', product.name))} className="w-full text-xs py-1.5 px-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-md transition-colors">
                                                    Amazon
                                                    </button>
                                                </div>
                                                </div>
                                            )}
                                        </div>
                                )}
                                </div>
                            </div>
                        </div>
                       );
                    })}
                    </div>
                    <button type="button" onClick={handleAddProduct} className="mt-3 py-2 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-yt-dark-gray text-gray-700 dark:text-yt-text-secondary font-semibold rounded-lg w-full border border-dashed border-gray-300 dark:border-yt-light-gray">Adicionar Produto</button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-yt-text-secondary">Thumbnail</label>
                    <div className="mt-2 flex gap-4">
                    <label className="flex items-center"><input type="radio" name="thumbSource" value={ThumbnailSource.URL} checked={thumbSource === ThumbnailSource.URL} onChange={() => setThumbSource(ThumbnailSource.URL)} className="h-4 w-4 text-gray-600 dark:text-yt-text-secondary border-gray-300 dark:border-yt-light-gray focus:ring-gray-500" /><span className="ml-2 text-gray-800 dark:text-yt-text-primary">URL</span></label>
                    <label className="flex items-center"><input type="radio" name="thumbSource" value={ThumbnailSource.UPLOAD} checked={thumbSource === ThumbnailSource.UPLOAD} onChange={() => setThumbSource(ThumbnailSource.UPLOAD)} className="h-4 w-4 text-gray-600 dark:text-yt-text-secondary border-gray-300 dark:border-yt-light-gray focus:ring-gray-500" /><span className="ml-2 text-gray-800 dark:text-yt-text-primary">Upload</span></label>
                    </div>
                    {thumbSource === ThumbnailSource.URL ? (
                    <input type="text" placeholder="https://exemplo.com/imagem.png" value={draft.thumbnail.startsWith('data:image') ? '' : draft.thumbnail} onChange={e => updateDraft('thumbnail', e.target.value)} className="mt-2 block w-full bg-white dark:bg-yt-dark-gray border border-gray-300 dark:border-yt-light-gray rounded-lg shadow-sm py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm" />
                    ) : (
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="mt-2 block w-full text-sm text-gray-500 dark:text-yt-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 dark:file:bg-yt-dark-gray file:text-gray-800 dark:file:text-yt-text-primary hover:file:bg-gray-200 dark:hover:file:bg-yt-light-gray" />
                    )}
                    {draft.thumbnail && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-yt-text-secondary">Preview:</p>
                                <button
                                    type="button"
                                    onClick={handleRemoveThumbnail}
                                    className="text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    Remover
                                </button>
                            </div>
                            <img src={draft.thumbnail} alt="Thumbnail preview" className="rounded-lg max-h-40 w-auto object-cover border border-gray-200 dark:border-yt-light-gray" />
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div className="p-3 flex justify-between items-center gap-3 border-t border-gray-200 dark:border-yt-light-gray bg-white dark:bg-yt-dark-gray flex-shrink-0">
            <div>
                {isEditing && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                    >
                        {isPublished ? 'Excluir Vídeo' : 'Excluir Rascunho'}
                    </button>
                )}
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-white hover:bg-gray-100 dark:bg-yt-light-gray dark:hover:bg-yt-light-gray/80 text-gray-800 dark:text-yt-text-primary font-semibold rounded-lg shadow-sm transition-colors border border-gray-300 dark:border-yt-light-gray">Cancelar</button>
                <button type="submit" className="py-2 px-4 bg-gray-800 hover:bg-gray-900 dark:bg-yt-text-primary dark:hover:bg-white text-white dark:text-yt-black font-bold rounded-lg shadow-sm transition-colors">{isEditing ? 'Salvar Alterações' : 'Salvar Rascunho'}</button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default DraftEditor;