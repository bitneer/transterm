'use client';
// Force rebuild for sync issue

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MarkdownEditor from '@/components/MarkdownEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SortableTag } from '../../new/SortableTag';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface SortableItemState {
  id: string; // string for DnD (existing will be stringified number)
  text: string;
}

export default function EditTermPage() {
  const router = useRouter();
  const supabase = createClient();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [note, setNote] = useState('');

  const [englishTerms, setEnglishTerms] = useState<SortableItemState[]>([]);
  const [newEnglishTerm, setNewEnglishTerm] = useState('');

  const [translations, setTranslations] = useState<SortableItemState[]>([]);
  const [newTranslation, setNewTranslation] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const fetchTerm = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('Term')
        .select(`*, Translation (*)`)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching term:', error);
        toast.error('용어 정보를 불러오는데 실패했습니다.');
        router.push('/admin');
        return;
      }

      setNote(data.note || '');

      // Combine name and aliases into englishTerms
      const loadedTerms = [
        { id: `term-name-${data.id}`, text: data.name },
        ...(data.aliases || []).map((a: string, idx: number) => ({
          id: `alias-db-${idx}-${a}`,
          text: a,
        })),
      ];
      setEnglishTerms(loadedTerms);

      if (data.Translation && data.Translation.length > 0) {
        const sortedTranslations = data.Translation.sort(
          (
            a: { sort_order: number | null; id: number },
            b: { sort_order: number | null; id: number },
          ) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id),
        );

        setTranslations(
          sortedTranslations.map((t: { id: number; text: string }) => ({
            id: t.id.toString(),
            text: t.text,
          })),
        );
      }
      setLoading(false);
    };

    fetchTerm();
  }, [id, router, supabase]);

  // --- English Terms Logic ---
  const handleAddEnglishTerms = () => {
    if (!newEnglishTerm.trim()) return;
    const newItems = newEnglishTerm
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({
        id: `eng-${Date.now()}-${Math.random()}`,
        text,
      }));
    if (newItems.length > 0) {
      setEnglishTerms((prev) => [...prev, ...newItems]);
      setNewEnglishTerm('');
    }
  };

  const handleEnglishTermKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEnglishTerms();
    }
  };

  const removeEnglishTerm = (id: string) => {
    setEnglishTerms(englishTerms.filter((t) => t.id !== id));
  };

  const handleEnglishTermDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setEnglishTerms((items) => {
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
    if (englishTerms.length === 0) {
      toast.error('최소 하나의 영문 용어를 입력하세요.');
      return;
    }
    if (translations.length === 0) {
      toast.error('최소 하나의 대역어가 필요합니다.');
      return;
    }
    if (translations.some((t) => !t.text.trim())) {
      toast.error('모든 대역어 필드를 입력하세요.');
      return;
    }

    setSaving(true);
    try {
      // 1. Term 업데이트
      const name = englishTerms[0].text;
      const aliasArray = englishTerms.slice(1).map((a) => a.text);

      const { error: termError } = await supabase
        .from('Term')
        .update({
          name,
          aliases: aliasArray,
          note: note.trim() || null,
        })
        .eq('id', id);

      if (termError) throw termError;

      // 2. Translations 업데이트 (기존 삭제 후 재등록 - 간단한 처리)
      // Transaction would be better but simple sequential ops for now
      const { error: deleteError } = await supabase
        .from('Translation')
        .delete()
        .eq('term_id', id);

      if (deleteError) throw deleteError;

      const translationInserts = translations.map((t, index) => ({
        term_id: Number(id),
        text: t.text,
        is_preferred: index === 0,
        sort_order: index,
      }));

      const { error: transError } = await supabase
        .from('Translation')
        .insert(translationInserts);

      if (transError) throw transError;

      toast.success('용어가 성공적으로 수정되었습니다!');
      router.push(`/term/${encodeURIComponent(name)}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating term:', error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        toast.error('이미 존재하는 용어 이름입니다. 다른 이름을 사용해주세요.');
      } else {
        toast.error(`수정 실패: ${(error as Error).message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('Term').delete().eq('id', id);

      if (error) throw error;

      toast.success('용어가 삭제되었습니다.');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error deleting term:', error);
      toast.error('삭제에 실패했습니다.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
            용어 수정
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-8 md:grid-cols-2"
        >
          {/* Left Column: Term & Translations */}
          <div className="space-y-8">
            {/* 용어 정보 (Unified) */}
            <Card>
              <CardHeader>
                <CardTitle>영문 용어</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="쉼표로 구분하여 일괄 추가 가능"
                      value={newEnglishTerm}
                      onChange={(e) => setNewEnglishTerm(e.target.value)}
                      onKeyDown={handleEnglishTermKeyDown}
                    />
                    <Button
                      type="button"
                      onClick={handleAddEnglishTerms}
                      variant="secondary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      추가
                    </Button>
                  </div>

                  <div className="min-h-[3rem] rounded-lg border border-dashed p-4">
                    {englishTerms.length === 0 ? (
                      <div className="text-muted-foreground py-2 text-center text-sm">
                        등록된 용어가 없습니다. 최소 하나 이상 등록해주세요.
                      </div>
                    ) : (
                      <DndContext
                        id="dnd-english-terms"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleEnglishTermDragEnd}
                      >
                        <SortableContext
                          items={englishTerms.map((t) => t.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="text-primary flex flex-wrap gap-2">
                            {englishTerms.map((term, index) => (
                              <SortableTag
                                key={term.id}
                                id={term.id}
                                text={term.text}
                                isPreferred={index === 0} // First item is preferred
                                onRemove={() => removeEnglishTerm(term.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 대역어 정보 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>한글 대역어</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="쉼표로 구분하여 일괄 추가 가능"
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
          </div>

          {/* Right Column: Note & Actions */}
          <div className="flex flex-col gap-8">
            {/* 노트 정보 */}
            <Card className="flex flex-1 flex-col">
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-[400px] flex-1 flex-col space-y-4">
                <div className="flex-1">
                  <MarkdownEditor
                    value={note}
                    onChange={(val) => setNote(val || '')}
                    height="100%"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                disabled={saving}
              >
                {saving ? (
                  '저장 중...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    수정사항 저장하기
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    disabled={saving}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제하기
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      이 작업은 되돌릴 수 없습니다. 용어와 관련된 모든 대역어가
                      영구적으로 삭제됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      삭제 확인
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
