# Supabase 프로덕션 배포 가이드

이 문서는 GitHub Actions를 사용하여 Supabase 데이터베이스 마이그레이션을 프로덕션 환경에 자동으로 배포하기 위한 설정 방법을 안내합니다.

## 1. 개요

`main` 브랜치에 코드가 푸시될 때마다 GitHub Actions 워크플로우(`deploy-supabase.yml`)가 실행되어, 로컬에서 생성된 마이그레이션 파일들을 프로덕션 Supabase 프로젝트에 적용합니다. 이를 통해 로컬 개발 환경과 프로덕션 환경의 데이터베이스 스키마 및 RLS 정책을 동기화합니다.

### 2. 필수 비밀키 (Secrets) 설정

GitHub 저장소에서 다음 비밀키들을 설정해야 워크플로우가 정상적으로 작동합니다.
**참고**: GitHub Secrets는 저장 시 암호화되며, 워크플로우 실행 로그에서도 별표(`***`)로 마스킹되어 표시되므로 외부로 노출되지 않습니다. 안심하고 설정하셔도 됩니다.

1.  GitHub 저장소 페이지로 이동합니다.
2.  상단 메뉴에서 **Settings**를 클릭합니다.
3.  왼쪽 사이드바에서 **Secrets and variables** > **Actions**를 선택합니다.
4.  **New repository secret** 버튼을 클릭하여 아래의 키들을 하나씩 추가합니다.

| 이름 (Name)             | 값 (Value)    | 설명                                                                                                  |
| :---------------------- | :------------ | :---------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | (토큰 값)     | [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens) 페이지에서 생성한 토큰입니다. |
| `SUPABASE_DB_PASSWORD`  | (비밀번호)    | 프로젝트 생성 시 설정한 데이터베이스 비밀번호입니다. 분실 시 Supabase 설정에서 재설정해야 합니다.     |
| `SUPABASE_PROJECT_ID`   | (프로젝트 ID) | Supabase 대시보드 URL의 `app.supabase.com/project/` 뒤에 오는 문자열입니다. (예: `abcdefghijklm`)     |

## 3. 배포 확인

설정이 완료되면 다음 절차를 통해 배포를 확인합니다.

1.  이 변경 사항이 포함된 브랜치를 `main`으로 Merge 합니다.
2.  GitHub 저장소의 **Actions** 탭에서 `Deploy Supabase` 워크플로우가 실행되는지 확인합니다.
3.  성공(녹색 체크)적으로 완료되면, Supabase 프로덕션 대시보드에서 `Table Editor`나 `SQL Editor`를 통해 변경된 스키마나 정책이 반영되었는지 확인합니다.

## 4. 문제 해결

- **로그인 실패**: `SUPABASE_ACCESS_TOKEN`이 올바른지, 만료되지 않았는지 확인하세요.
- **연결 실패**: `SUPABASE_PROJECT_ID`와 `SUPABASE_DB_PASSWORD`가 정확한지 확인하세요.
- **마이그레이션 충돌**: 로컬 마이그레이션 파일(`src/supabase/migrations`)의 타임스탬프 순서가 꼬이지 않았는지, 이미 적용된 마이그레이션과 충돌하는 내용이 없는지 확인해야 합니다.
