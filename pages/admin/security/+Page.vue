<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-6">
      <div>
        <h1 class="card-title text-2xl">Cloudflare Turnstile 登录验证</h1>
        <p class="text-sm text-base-content/70 mt-2">
          在管理员登录页接入 Cloudflare Turnstile 小组件，用于拦截自动化爆破登录。
        </p>
      </div>

      <!-- 当前状态 -->
      <div class="alert" :class="turnstileEnabled ? 'alert-success' : 'alert-warning'">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span v-if="turnstileEnabled">Turnstile 已启用 - 登录页已显示人机验证</span>
        <span v-else>Turnstile 未启用 - 请按下方步骤配置</span>
      </div>

      <div class="divider"></div>

      <!-- 配置步骤 -->
      <div class="space-y-6">
        <h2 class="text-lg font-semibold">配置步骤</h2>

        <!-- 步骤 1 -->
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">1</div>
          <div class="flex-1 space-y-2">
            <h3 class="font-medium">创建 Turnstile 站点</h3>
            <p class="text-sm text-base-content/70">
              前往
              <a href="https://dash.cloudflare.com/turnstile" target="_blank" class="link link-primary">Cloudflare Dashboard → Turnstile</a>
              创建站点，获取以下两个密钥：
            </p>
            <div class="mockup-code text-sm">
              <pre><code>TURNSTILE_SITE_KEY   = 前端小组件站点 Key</code></pre>
              <pre><code>TURNSTILE_SECRET_KEY = 服务端校验 Secret Key</code></pre>
            </div>
          </div>
        </div>

        <!-- 步骤 2 -->
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">2</div>
          <div class="flex-1 space-y-2">
            <h3 class="font-medium">配置环境变量</h3>
            <p class="text-sm text-base-content/70">
              使用 wrangler 命令将密钥配置到 Cloudflare Workers：
            </p>
            <div class="mockup-code text-sm">
              <pre data-prefix="$"><code>wrangler secret put TURNSTILE_SITE_KEY</code></pre>
              <pre data-prefix="$"><code>wrangler secret put TURNSTILE_SECRET_KEY</code></pre>
            </div>
            <div class="alert alert-info text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>本地开发时，可在 <code>.env</code> 文件中直接配置这两个变量。</span>
            </div>
          </div>
        </div>

        <!-- 步骤 3 -->
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">3</div>
          <div class="flex-1 space-y-2">
            <h3 class="font-medium">完成</h3>
            <p class="text-sm text-base-content/70">
              配置完成后，刷新此页面查看状态变化。后台登录页会自动显示 Turnstile 小组件，并在服务端强制校验。
            </p>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 状态说明 -->
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">状态说明</h2>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>配置状态</th>
                <th>行为</th>
              </tr>
            </thead>
            <tbody>
              <tr :class="{'bg-base-200': !turnstileEnabled}">
                <td><span class="badge" :class="turnstileEnabled ? 'badge-ghost' : 'badge-warning'">两个变量都未配置</span></td>
                <td>Turnstile 默认关闭，不影响现有登录流程</td>
              </tr>
              <tr :class="{'bg-base-200': turnstileEnabled}">
                <td><span class="badge" :class="turnstileEnabled ? 'badge-success' : 'badge-ghost'">两个变量都已配置</span></td>
                <td>登录页自动显示 Turnstile 小组件，服务端强制校验</td>
              </tr>
              <tr>
                <td><span class="badge badge-ghost">只配置了一个变量</span></td>
                <td>系统自动视为未启用，避免半配置状态</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
import type { Data } from "./+data";

const { turnstileEnabled } = useData<Data>();
</script>
