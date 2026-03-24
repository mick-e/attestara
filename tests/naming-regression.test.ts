// tests/naming-regression.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Convert Windows backslash paths to forward slashes for grep/bash
const ROOT = join(__dirname, '..').replace(/\\/g, '/')

describe('Naming Regression: verify Attestara branding consistency', () => {

  describe('No remaining "agentclear" references in source files', () => {
    it('should have zero "agentclear" references in TypeScript files', () => {
      const result = execSync(
        `grep -ri "agentclear" --include="*.ts" --include="*.tsx" -l ${ROOT}/packages/ ${ROOT}/scripts/ ${ROOT}/infrastructure/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const files = result ? result.split('\n').filter(f =>
        !f.includes('node_modules') &&
        !f.includes('dist') &&
        !f.includes('.next') &&
        !f.includes('.claude/worktrees') &&
        !f.includes('naming-regression')
      ) : []
      expect(files, `Found "agentclear" in: ${files.join(', ')}`).toHaveLength(0)
    })

    it('should have zero "agentclear" references in JSON config files', () => {
      const result = execSync(
        `grep -ri "agentclear" --include="*.json" -l ${ROOT}/packages/ ${ROOT}/package.json 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const files = result ? result.split('\n').filter(f =>
        !f.includes('node_modules') &&
        !f.includes('pnpm-lock') &&
        !f.includes('.claude/worktrees')
      ) : []
      expect(files, `Found "agentclear" in: ${files.join(', ')}`).toHaveLength(0)
    })

    it('should have zero "agentclear" references in Solidity files', () => {
      const result = execSync(
        `grep -ri "agentclear" --include="*.sol" -l ${ROOT}/packages/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const files = result ? result.split('\n').filter(f =>
        !f.includes('node_modules') &&
        !f.includes('.claude/worktrees')
      ) : []
      expect(files, `Found "agentclear" in: ${files.join(', ')}`).toHaveLength(0)
    })

    it('should have zero "agentclear" references in infrastructure files', () => {
      const result = execSync(
        `grep -ri "agentclear" --include="*.yaml" --include="*.yml" --include="*.sh" -l ${ROOT}/infrastructure/ ${ROOT}/scripts/ ${ROOT}/.github/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const files = result ? result.split('\n').filter(f =>
        !f.includes('.claude/worktrees')
      ) : []
      expect(files, `Found "agentclear" in: ${files.join(', ')}`).toHaveLength(0)
    })

    it('should have zero "agentclear" references in .env.example', () => {
      const envFile = readFileSync(join(ROOT, '.env.example'), 'utf-8')
      const matches = envFile.match(/agentclear/gi) || []
      expect(matches, `Found "agentclear" in .env.example`).toHaveLength(0)
    })

    it('should have zero "agentclear" references in Prisma schema', () => {
      const result = execSync(
        `grep -ri "agentclear" --include="*.prisma" -l ${ROOT}/packages/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const files = result ? result.split('\n').filter(Boolean) : []
      expect(files, `Found "agentclear" in: ${files.join(', ')}`).toHaveLength(0)
    })
  })

  describe('Package names use @attestara/ prefix', () => {
    const packages = ['types', 'contracts', 'sdk', 'prover', 'relay', 'cli', 'portal']

    for (const pkg of packages) {
      it(`@attestara/${pkg} package.json has correct name`, () => {
        const pkgPath = join(ROOT, 'packages', pkg, 'package.json')
        expect(existsSync(pkgPath), `${pkgPath} should exist`).toBe(true)
        const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        expect(pkgJson.name).toBe(`@attestara/${pkg}`)
      })
    }

    it('root package.json has name "attestara"', () => {
      const pkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
      expect(pkgJson.name).toBe('attestara')
    })
  })

  describe('Class and type names use Attestara prefix', () => {
    it('AttestaraClient class exists in SDK', () => {
      const result = execSync(
        `grep -r "AttestaraClient" --include="*.ts" ${ROOT}/packages/sdk/src/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      expect(result.length, 'AttestaraClient should be defined in SDK').toBeGreaterThan(0)
    })

    it('AttestaraError class exists in types', () => {
      const result = execSync(
        `grep -r "AttestaraError" --include="*.ts" ${ROOT}/packages/types/src/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      expect(result.length, 'AttestaraError should be defined in types').toBeGreaterThan(0)
    })

    it('AttestaraConfig type exists in types', () => {
      const result = execSync(
        `grep -r "AttestaraConfig" --include="*.ts" ${ROOT}/packages/types/src/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      expect(result.length, 'AttestaraConfig should be defined in types').toBeGreaterThan(0)
    })

    it('No legacy client class remains', () => {
      const result = execSync(
        `grep -r "AgentClearClient" --include="*.ts" --include="*.tsx" ${ROOT}/packages/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const matches = result ? result.split('\n').filter(l =>
        !l.includes('node_modules') && !l.includes('.claude/worktrees')
      ) : []
      expect(matches, 'AgentClearClient should not exist').toHaveLength(0)
    })

    it('No legacy error class remains', () => {
      const result = execSync(
        `grep -r "AgentClearError" --include="*.ts" ${ROOT}/packages/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const matches = result ? result.split('\n').filter(l =>
        !l.includes('node_modules') && !l.includes('.claude/worktrees')
      ) : []
      expect(matches, 'AgentClearError should not exist').toHaveLength(0)
    })
  })

  describe('API key prefix uses "at_"', () => {
    it('auth code uses "at_" prefix for tokens', () => {
      const result = execSync(
        `grep -r "at_access_token\\|at_refresh_token" --include="*.ts" --include="*.tsx" ${ROOT}/packages/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      expect(result.length, 'Should find at_ prefixed token references').toBeGreaterThan(0)
    })

    it('no "ac_access_token" or "ac_refresh_token" remains', () => {
      const result = execSync(
        `grep -r "ac_access_token\\|ac_refresh_token" --include="*.ts" --include="*.tsx" ${ROOT}/packages/ 2>/dev/null || true`,
        { encoding: 'utf-8' }
      ).trim()
      const matches = result ? result.split('\n').filter(l =>
        !l.includes('node_modules') && !l.includes('.claude/worktrees')
      ) : []
      expect(matches, 'Old ac_ prefix should not exist').toHaveLength(0)
    })
  })

  describe('Portal branding uses Attestara', () => {
    it('portal layout contains "Attestara" in metadata', () => {
      const layoutPath = join(ROOT, 'packages', 'portal', 'app', 'layout.tsx')
      if (existsSync(layoutPath)) {
        const content = readFileSync(layoutPath, 'utf-8')
        expect(content).toContain('Attestara')
        expect(content).not.toMatch(/AgentClear(?!.*\/\/)/) // not in non-comment context
      }
    })

    it('sidebar contains "Attestara" branding', () => {
      const sidebarPath = join(ROOT, 'packages', 'portal', 'components', 'layout', 'sidebar.tsx')
      if (existsSync(sidebarPath)) {
        const content = readFileSync(sidebarPath, 'utf-8')
        expect(content).toContain('Attestara')
      }
    })
  })

  describe('Infrastructure uses attestara naming', () => {
    it('render.yaml uses attestara- service names', () => {
      const renderPath = join(ROOT, 'infrastructure', 'render.yaml')
      if (existsSync(renderPath)) {
        const content = readFileSync(renderPath, 'utf-8')
        expect(content).toContain('attestara-')
        expect(content).not.toContain('agentclear-')
      }
    })

    it('docker-compose uses attestara naming', () => {
      const composePath = join(ROOT, 'infrastructure', 'docker-compose.yml')
      if (existsSync(composePath)) {
        const content = readFileSync(composePath, 'utf-8')
        expect(content).not.toContain('agentclear')
      }
    })

    it('CI workflow has no @agentclear/ references', () => {
      const ciPath = join(ROOT, '.github', 'workflows', 'ci.yml')
      if (existsSync(ciPath)) {
        const content = readFileSync(ciPath, 'utf-8')
        expect(content).not.toContain('@agentclear/')
        expect(content).not.toMatch(/agentclear/i)
      }
    })
  })
})
