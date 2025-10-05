import React, { useState, useEffect } from 'react';
import { Stage, ChecklistTemplateItem } from '../types';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';


interface ChecklistManagerProps {
  stagesConfig: Stage[];
  onUpdate: (newConfig: Stage[]) => void;
}

const ChecklistManager: React.FC<ChecklistManagerProps> = ({ stagesConfig, onUpdate }) => {
  const [localConfig, setLocalConfig] = useState<Stage[]>([]);
  const [editingTask, setEditingTask] = useState<{ stageId: string; taskKey: string; } | null>(null);
  const [addingTaskToStage, setAddingTaskToStage] = useState<string | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  
  useEffect(() => {
    // Deep copy to prevent mutation of the original prop
    setLocalConfig(JSON.parse(JSON.stringify(stagesConfig)));
  }, [stagesConfig]);

  const handleUpdateTaskLabel = (stageId: string, taskKey: string, newLabel: string) => {
    setLocalConfig(prev =>
      prev.map(stage =>
        stage.id === stageId
          ? {
              ...stage,
              tasks: stage.tasks.map(task =>
                task.key === taskKey ? { ...task, label: newLabel } : task
              ),
            }
          : stage
      )
    );
  };

  const handleMoveTask = (sourceStageId: string, taskKey: string, destinationStageId: string) => {
    if (sourceStageId === destinationStageId) return;

    let taskToMove: ChecklistTemplateItem | undefined;

    // Remove from source stage
    const updatedConfig = localConfig.map(stage => {
      if (stage.id === sourceStageId) {
        taskToMove = stage.tasks.find(t => t.key === taskKey);
        return { ...stage, tasks: stage.tasks.filter(t => t.key !== taskKey) };
      }
      return stage;
    });

    // Add to destination stage
    if (taskToMove) {
      setLocalConfig(updatedConfig.map(stage => {
        if (stage.id === destinationStageId) {
          return { ...stage, tasks: [...stage.tasks, taskToMove!] };
        }
        return stage;
      }));
    }
  };
  
    const handleMoveTaskOrder = (stageId: string, taskIndex: number, direction: 'up' | 'down') => {
        setLocalConfig(prev => {
            const newConfig = JSON.parse(JSON.stringify(prev));
            const stage = newConfig.find((s: Stage) => s.id === stageId);
            if (!stage) return prev;

            const tasks = stage.tasks;
            const targetIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;

            if (targetIndex >= 0 && targetIndex < tasks.length) {
                // Simple swap
                [tasks[taskIndex], tasks[targetIndex]] = [tasks[targetIndex], tasks[taskIndex]];
            }
            
            return newConfig;
        });
    };

  const handleRemoveTask = (stageId: string, taskKey: string) => {
    if(window.confirm('Tem certeza que deseja remover esta tarefa? Ela será removida de todos os rascunhos.')) {
        setLocalConfig(prev =>
            prev.map(stage =>
                stage.id === stageId
                ? { ...stage, tasks: stage.tasks.filter(task => task.key !== taskKey) }
                : stage
            )
        );
    }
  };

  const handleAddTask = (stageId: string, label: string) => {
    if (!label.trim()) return;
    const newKey = `custom_${Date.now()}`;
    const newTask: ChecklistTemplateItem = { key: newKey, label: label.trim() };
    
    setLocalConfig(prev => 
        prev.map(stage => 
            stage.id === stageId 
            ? { ...stage, tasks: [...stage.tasks, newTask] } 
            : stage
        )
    );
    setAddingTaskToStage(null); // Close input form
  };
  
  const handleAddStage = (stageName: string) => {
    if (!stageName.trim()) {
      setIsAddingStage(false);
      return;
    }
    const newStage: Stage = {
      id: `stage_${Date.now()}`,
      name: stageName.trim(),
      tasks: [],
    };
    setLocalConfig(prev => [...prev, newStage]);
    setIsAddingStage(false);
  };

  const handleRemoveStage = (stageId: string) => {
    if (window.confirm('Tem certeza que deseja remover esta categoria e todas as suas tarefas? Esta ação não pode ser desfeita.')) {
      setLocalConfig(prev => prev.filter(stage => stage.id !== stageId));
    }
  };
  
  const handleMoveStage = (stageIndex: number, direction: 'up' | 'down') => {
    setLocalConfig(prev => {
        const newConfig = JSON.parse(JSON.stringify(prev));
        const targetIndex = direction === 'up' ? stageIndex - 1 : stageIndex + 1;

        if (targetIndex >= 0 && targetIndex < newConfig.length) {
            [newConfig[stageIndex], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[stageIndex]];
        }
        
        return newConfig;
    });
  };

  const handleUpdateStageName = (stageId: string, newName: string) => {
    setLocalConfig(prev =>
      prev.map(stage =>
        stage.id === stageId ? { ...stage, name: newName } : stage
      )
    );
  };

  const handleSaveChanges = () => {
    onUpdate(localConfig);
  };

  return (
    <div className="space-y-8">
        <div className="bg-white dark:bg-yt-dark-gray p-4 rounded-xl border border-gray-200 dark:border-yt-light-gray flex justify-between items-center sticky top-0 z-10">
            <p className="text-gray-600 dark:text-yt-text-secondary text-sm">Personalize as etapas do seu fluxo de trabalho. As alterações serão aplicadas a todos os rascunhos.</p>
            <button
                onClick={handleSaveChanges}
                className="py-2 px-5 bg-gray-800 hover:bg-gray-900 dark:bg-yt-text-primary dark:hover:bg-white text-white dark:text-yt-black font-bold rounded-lg shadow-sm transition-colors"
            >
                Salvar Alterações
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {localConfig.map((stage, stageIndex) => (
                <div key={stage.id} className="bg-white dark:bg-yt-dark-gray rounded-xl border border-gray-200/80 dark:border-yt-light-gray/60 p-5">
                    <div className="flex justify-between items-center mb-4">
                        {editingStageId === stage.id ? (
                            <input
                                type="text"
                                value={stage.name}
                                onChange={(e) => handleUpdateStageName(stage.id, e.target.value)}
                                onBlur={() => setEditingStageId(null)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingStageId(null); }}
                                autoFocus
                                className="w-full text-lg font-semibold bg-gray-100 dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-md py-1 px-2 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray"
                            />
                        ) : (
                           <h3 className="text-lg font-semibold text-gray-800 dark:text-yt-text-primary">{stage.name}</h3>
                        )}
                         <div className="flex items-center gap-1">
                            <button onClick={() => handleMoveStage(stageIndex, 'up')} disabled={stageIndex === 0} title="Mover para cima" className="p-2 text-gray-500 hover:text-gray-800 dark:text-yt-text-secondary dark:hover:text-yt-text-primary disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUpIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleMoveStage(stageIndex, 'down')} disabled={stageIndex === localConfig.length - 1} title="Mover para baixo" className="p-2 text-gray-500 hover:text-gray-800 dark:text-yt-text-secondary dark:hover:text-yt-text-primary disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDownIcon className="h-4 w-4" /></button>
                            <button onClick={() => setEditingStageId(stage.id)} title="Renomear categoria" className="p-2 text-gray-500 hover:text-blue-600 dark:text-yt-text-secondary dark:hover:text-blue-400"><PencilIcon className="h-4 w-4" /></button>
                            {localConfig.length > 1 && (
                                <button onClick={() => handleRemoveStage(stage.id)} title="Excluir categoria" className="p-2 text-gray-500 hover:text-red-600 dark:text-yt-text-secondary dark:hover:text-red-400"><TrashIcon className="h-4 w-4" /></button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {stage.tasks.map((task, taskIndex) => (
                            <div key={task.key} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-yt-black/50">
                                {editingTask?.taskKey === task.key ? (
                                    <input
                                        type="text"
                                        value={task.label}
                                        onChange={(e) => handleUpdateTaskLabel(stage.id, task.key, e.target.value)}
                                        onBlur={() => setEditingTask(null)}
                                        onKeyDown={(e) => e.key === 'Enter' && setEditingTask(null)}
                                        autoFocus
                                        className="flex-grow bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-md py-1 px-2 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm"
                                    />
                                ) : (
                                    <p className="flex-grow text-sm text-gray-800 dark:text-yt-text-primary pl-2">{task.label}</p>
                                )}
                                <select 
                                    value={stage.id} 
                                    onChange={(e) => handleMoveTask(stage.id, task.key, e.target.value)}
                                    className="text-xs bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-md py-1 px-2 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-yt-light-gray"
                                >
                                    {localConfig.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="flex items-center">
                                    <button onClick={() => handleMoveTaskOrder(stage.id, taskIndex, 'up')} disabled={taskIndex === 0} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-yt-text-primary disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUpIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleMoveTaskOrder(stage.id, taskIndex, 'down')} disabled={taskIndex === stage.tasks.length - 1} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-yt-text-primary disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDownIcon className="h-4 w-4" /></button>
                                </div>
                                <button onClick={() => setEditingTask({ stageId: stage.id, taskKey: task.key })} className="p-2 text-gray-500 hover:text-blue-600 dark:text-yt-text-secondary dark:hover:text-blue-400"><PencilIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleRemoveTask(stage.id, task.key)} className="p-2 text-gray-500 hover:text-red-600 dark:text-yt-text-secondary dark:hover:text-red-400"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        ))}

                        {addingTaskToStage === stage.id ? (
                             <form onSubmit={(e) => { e.preventDefault(); handleAddTask(stage.id, (e.currentTarget.elements.namedItem('taskLabel') as HTMLInputElement).value); }} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-yt-black/50">
                                <input
                                    name="taskLabel"
                                    type="text"
                                    placeholder="Nome da nova tarefa"
                                    autoFocus
                                    className="flex-grow bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-md py-1 px-2 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm"
                                />
                                <button type="submit" className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400">Salvar</button>
                                <button type="button" onClick={() => setAddingTaskToStage(null)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400">X</button>
                            </form>
                        ) : (
                            <button onClick={() => setAddingTaskToStage(stage.id)} className="w-full mt-3 py-2 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-yt-dark-gray/50 text-gray-700 dark:text-yt-text-secondary font-semibold rounded-lg border border-dashed border-gray-300 dark:border-yt-light-gray flex items-center justify-center gap-2 text-sm">
                                <PlusIcon className="h-4 w-4" />
                                Adicionar Tarefa
                            </button>
                        )}
                    </div>
                </div>
            ))}
             <div>
                {isAddingStage ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleAddStage((e.currentTarget.elements.namedItem('stageName') as HTMLInputElement).value); }} className="p-5 bg-white dark:bg-yt-dark-gray rounded-xl border border-gray-200/80 dark:border-yt-light-gray/60">
                         <h3 className="text-lg font-semibold text-gray-800 dark:text-yt-text-primary mb-4">Nova Categoria</h3>
                        <input
                            name="stageName"
                            type="text"
                            placeholder="Nome da nova categoria"
                            autoFocus
                            className="w-full bg-white dark:bg-yt-light-gray border-gray-300 dark:border-yt-light-gray rounded-md py-2 px-3 text-gray-900 dark:text-yt-text-primary focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-yt-light-gray sm:text-sm"
                        />
                        <div className="flex gap-2 mt-4">
                            <button type="submit" className="py-1.5 px-4 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg text-sm">Salvar</button>
                            <button type="button" onClick={() => setIsAddingStage(false)} className="py-1.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-sm">Cancelar</button>
                        </div>
                    </form>
                ) : (
                    <button 
                        onClick={() => setIsAddingStage(true)}
                        className="w-full h-full min-h-[150px] flex flex-col items-center justify-center bg-transparent hover:bg-gray-50 dark:hover:bg-yt-dark-gray/50 text-gray-500 dark:text-yt-text-secondary font-semibold rounded-xl border-2 border-dashed border-gray-300 dark:border-yt-light-gray transition-colors"
                    >
                        <PlusIcon className="h-6 w-6 mb-2" />
                        Adicionar Categoria
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default ChecklistManager;
