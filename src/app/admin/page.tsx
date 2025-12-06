"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ArrowLeft, LogOut } from "lucide-react"; // Added LogOut icon
import { toast } from "sonner";
import type { Database } from "@/types/supabase";

type Term = Database['public']['Tables']['Term']['Row'] & {
    Translation: Database['public']['Tables']['Translation']['Row'][];
};

export default function AdminPage() {
    const router = useRouter(); // Initialized useRouter
    const supabase = createClient(); // Initialized supabase client
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTerms = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("Term")
            .select(`*, Translation (*)`)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching terms:", error);
            toast.error("용어 목록을 불러오는데 실패했습니다.");
        } else {
            setTerms(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTerms();
    }, []);

    const handleLogout = async () => { // Added handleLogout function
        await supabase.auth.signOut();
        toast.success("로그아웃 되었습니다.");
        router.push("/");
        router.refresh();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("정말로 이 용어를 삭제하시겠습니까?")) return;

        const { error } = await supabase.from("Term").delete().eq("id", id);

        if (error) {
            console.error("Error deleting term:", error);
            toast.error("삭제 실패");
        } else {
            toast.success("용어가 삭제되었습니다.");
            fetchTerms(); // 목록 갱신
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                            용어 관리
                        </h1>
                    </div>
                    <div className="flex gap-2"> {/* Modified this div */}
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            로그아웃
                        </Button>
                        <Link href="/admin/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                새 용어 등록
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>용어 (English)</TableHead>
                                <TableHead>이명 (Aliases)</TableHead>
                                <TableHead>대역어 (Translations)</TableHead>
                                <TableHead className="text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        로딩 중...
                                    </TableCell>
                                </TableRow>
                            ) : terms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                        등록된 용어가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                terms.map((term) => (
                                    <TableRow key={term.id}>
                                        <TableCell className="font-medium">{term.name}</TableCell>
                                        <TableCell>{term.aliases?.join(", ") || "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {term.Translation.map((t) => (
                                                    <Badge
                                                        key={t.id}
                                                        variant={t.is_preferred ? "default" : "secondary"}
                                                        className="text-xs"
                                                    >
                                                        {t.text}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                onClick={() => router.push(`/admin/edit/${term.id}`)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-red-600"
                                                onClick={() => handleDelete(term.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
