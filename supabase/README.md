# Supabase Migrations

이 디렉토리는 Supabase 데이터베이스 스키마 변경 사항을 관리합니다.

## 구조

`migrations/` 폴더 내의 파일들은 생성된 시간 순서대로 실행되어야 합니다.

- `20241206000000_init_schema.sql`: 초기 테이블(`Term`, `Translation`) 및 기본 RLS 정책 생성
- `20241206000001_add_update_policies.sql`: UPDATE 및 DELETE에 대한 RLS 정책 추가

## 사용 방법

Supabase CLI를 사용하는 경우 다음 명령어로 로컬 DB에 적용할 수 있습니다:

```bash
supabase db reset
```

또는 Supabase 대시보드의 SQL Editor에서 파일 내용을 순서대로 복사하여 실행할 수 있습니다.
