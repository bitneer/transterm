'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTag } from './SortableTag';

interface SortableItemState {
  id: string;
  text: string;
}

import { Suspense } from 'react';

function NewTermContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const [aliases, setAliases] = useState<SortableItemState[]>([]);
  const [newAlias, setNewAlias] = useState('');

  const [translations, setTranslations] = useState<SortableItemState[]>([]);
  const [newTranslation, setNewTranslation] = useState('');

  useEffect(() => {
    const termQuery = searchParams.get('term');
    if (termQuery) {
      setName(termQuery);
    }
  }, [searchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // --- Aliases Logic ---
  const handleAddAliases = () => {
    if (!newAlias.trim()) return;
    const newItems = newAlias
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({
        id: `alias-${Date.now()}-${Math.random()}`,
        text,
      }));
    if (newItems.length > 0) {
      setAliases((prev) => [...prev, ...newItems]);
      setNewAlias('');
    }
  };

  const handleAliasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAliases();
    }
  };

  const removeAlias = (id: string) => {
    setAliases(aliases.filter((t) => t.id !== id));
  };

  const handleAliasDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setAliases((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- Translations Logic ---

  const handleAddTranslations = () => {
    if (!newTranslation.trim()) return;

    const newItems = newTranslation
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((text) => ({
        id: `trans-${Date.now()}-${Math.random()}`,
        text,
      }));

    if (newItems.length > 0) {
      setTranslations((prev) => [...prev, ...newItems]);
      setNewTranslation('');
    }
  };

  const handleTranslationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTranslations();
    }
  };

  const removeTranslationField = (id: string) => {
    setTranslations(translations.filter((t) => t.id !== id));
  };

  const handleTranslationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTranslations((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('용어 이름을 입력해주세요.');
      return;
    }
    if (translations.length === 0) {
      toast.error('최소 하나의 대역어를 입력해야 합니다.');
      return;
    }

    setLoading(true);
    try {
      // 1. Term 저장
      const aliasArray = aliases.map((a) => a.text);

      const { data: termData, error: termError } = await supabase
        .from('Term')
        .insert({
          name,
          aliases: aliasArray,
          note: note.trim() || null,
        })
        .select()
        .single();

      if (termError) throw termError;

      // 2. Translations 저장
      const translationInserts = translations.map((t, index) => ({
        term_id: termData.id,
        text: t.text,
        is_preferred: index === 0, // 첫 번째 항목이 선호 대역어
        sort_order: index,
      }));

      const { error: transError } = await supabase
        .from('Translation')
        .insert(translationInserts);

      if (transError) throw transError;

      toast.success('용어가 성공적으로 등록되었습니다!');
      router.push('/');
    } catch (error) {
      console.error('Error saving term:', error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        toast.error('이미 등록된 용어입니다. 다른 이름을 사용해주세요.');
      } else {
        toast.error(`저장 실패: ${(error as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans dark:bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            새 용어 등록
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 용어 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>용어 정보 (English)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">용어 이름</Label>
                <Input
                  id="name"
                  placeholder="예: Context"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliases">별명</Label>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="추가할 영어 별명을 입력하세요 (쉼표로 구분하여 일괄 추가 가능)"
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      onKeyDown={handleAliasKeyDown}
                    />
                    <Button
                      type="button"
                      onClick={handleAddAliases}
                      variant="secondary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      추가
                    </Button>
                  </div>

                  <div className="min-h-[3rem] rounded-lg border border-dashed p-4">
                    {aliases.length === 0 ? (
                      <div className="text-muted-foreground py-2 text-center text-sm">
                        등록된 별명이 없습니다.
                      </div>
                    ) : (
                      <DndContext
                        id="dnd-aliases"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleAliasDragEnd}
                      >
                        <SortableContext
                          items={aliases.map((t) => t.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="text-primary flex flex-wrap gap-2">
                            {aliases.map((alias) => (
                              <SortableTag
                                key={alias.id}
                                id={alias.id}
                                text={alias.text}
                                isPreferred={false}
                                onRemove={() => removeAlias(alias.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 대역어 정보 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>한글 대역어</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input
                  placeholder="추가할 대역어를 입력하세요 (쉼표로 구분하여 일괄 추가 가능)"
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  onKeyDown={handleTranslationKeyDown}
                />
                <Button
                  type="button"
                  onClick={handleAddTranslations}
                  variant="secondary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  추가
                </Button>
              </div>

              <div className="min-h-[3rem] rounded-lg border border-dashed p-4">
                {translations.length === 0 ? (
                  <div className="text-muted-foreground py-2 text-center text-sm">
                    등록된 대역어가 없습니다.
                  </div>
                ) : (
                  <DndContext
                    id="dnd-translations"
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleTranslationDragEnd}
                  >
                    <SortableContext
                      items={translations.map((t) => t.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="text-primary flex flex-wrap gap-2">
                        {translations.map((trans, index) => (
                          <SortableTag
                            key={trans.id}
                            id={trans.id}
                            text={trans.text}
                            isPreferred={index === 0}
                            onRemove={() => removeTranslationField(trans.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 노트 (선택) */}
          <Card>
            <CardHeader>
              <CardTitle>노트 (선택)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="용어에 대한 설명이나 참고 사항을 입력하세요."
                className="min-h-[100px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              '저장 중...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                용어 저장하기
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function NewTermPage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center p-8">로딩 중...</div>}
    >
      <NewTermContent />
    </Suspense>
  );
}
