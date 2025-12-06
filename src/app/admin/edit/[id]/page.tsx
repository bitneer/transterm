"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface TranslationInput {
    text: string;
    isPreferred: boolean;
    usage: string;
}

export default function EditTermPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [aliases, setAliases] = useState("");
    const [translations, setTranslations] = useState<TranslationInput[]>([
        { text: "", isPreferred: false, usage: "" },
    ]);

    useEffect(() => {
        const fetchTerm = async () => {
            if (!id) return;

            const { data, error } = await supabase
                .from("Term")
                .select(`*, Translation (*)`)
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching term:", error);
                toast.error("용어 정보를 불러오는데 실패했습니다.");
                router.push("/admin");
                return;
            }

            setName(data.name);
            setAliases(data.aliases?.join(", ") || "");

            if (data.Translation && data.Translation.length > 0) {
                setTranslations(
                    data.Translation.map((t: any) => ({
                        text: t.text,
                        isPreferred: t.is_preferred || false,
                        usage: t.usage || "",
                    }))
                );
            }
            setLoading(false);
        };

        fetchTerm();
    }, [id, router]);

    const addTranslationField = () => {
        setTranslations([...translations, { text: "", isPreferred: false, usage: "" }]);
    };

    const removeTranslationField = (index: number) => {
        if (translations.length > 1) {
            const newTranslations = [...translations];
            newTranslations.splice(index, 1);
            setTranslations(newTranslations);
        }
    };

    const updateTranslation = (index: number, field: keyof TranslationInput, value: any) => {
        const newTranslations = [...translations];
        // @ts-ignore
        newTranslations[index][field] = value;
        setTranslations(newTranslations);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("용어 이름을 입력해주세요.");
            return;
        }
        if (translations.some((t) => !t.text.trim())) {
            toast.error("모든 대역어 필드를 입력해주세요.");
            return;
        }

        setSaving(true);
        try {
            // 1. Term 업데이트
            const aliasArray = aliases.split(",").map((s) => s.trim()).filter(Boolean);

            const { error: termError } = await supabase
                .from("Term")
                .update({ name, aliases: aliasArray })
                .eq("id", id);

            if (termError) throw termError;

            // 2. Translations 업데이트 (기존 삭제 후 재등록)
            // 먼저 기존 대역어 삭제
            const { error: deleteError } = await supabase
                .from("Translation")
                .delete()
                .eq("term_id", id);

            if (deleteError) throw deleteError;

            // 새 대역어 등록
            const translationInserts = translations.map((t) => ({
                term_id: Number(id),
                text: t.text,
                is_preferred: t.isPreferred,
                usage: t.usage || null,
            }));

            const { error: transError } = await supabase
                .from("Translation")
                .insert(translationInserts);

            if (transError) throw transError;

            toast.success("용어가 성공적으로 수정되었습니다!");
            router.push("/admin");
            router.refresh();
        } catch (error: any) {
            console.error("Error updating term:", error);
            toast.error(`수정 실패: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <p>로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        돌아가기
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        용어 수정
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
                                <Label htmlFor="name">용어 이름 (필수)</Label>
                                <Input
                                    id="name"
                                    placeholder="예: Context"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="aliases">이명 / 복수형 (쉼표로 구분)</Label>
                                <Input
                                    id="aliases"
                                    placeholder="예: Ctx, Contexts"
                                    value={aliases}
                                    onChange={(e) => setAliases(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 대역어 정보 */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>한글 대역어</CardTitle>
                            <Button type="button" variant="outline" size="sm" onClick={addTranslationField}>
                                <Plus className="w-4 h-4 mr-2" />
                                대역어 추가
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {translations.map((trans, index) => (
                                <div key={index} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-4 relative">
                                    {translations.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => removeTranslationField(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>대역어 (필수)</Label>
                                            <Input
                                                placeholder="예: 맥락"
                                                value={trans.text}
                                                onChange={(e) => updateTranslation(index, "text", e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2 pt-8">
                                            <Checkbox
                                                id={`preferred-${index}`}
                                                checked={trans.isPreferred}
                                                onCheckedChange={(checked) => updateTranslation(index, "isPreferred", checked)}
                                            />
                                            <Label htmlFor={`preferred-${index}`} className="cursor-pointer">
                                                선호 대역어 (대표)
                                            </Label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>용례 / 설명 (선택)</Label>
                                        <Textarea
                                            placeholder="예: 일반적인 상황에서 사용"
                                            value={trans.usage}
                                            onChange={(e) => updateTranslation(index, "usage", e.target.value)}
                                            className="h-20"
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Button type="submit" className="w-full" size="lg" disabled={saving}>
                        {saving ? (
                            "저장 중..."
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                수정사항 저장하기
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
