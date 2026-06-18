<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div>
        <h1 class="text-2xl font-bold">Key 管理</h1>
        <p class="text-sm text-base-content/70">查看、筛选和管理所有授权 Key。</p>
      </div>

      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Key</th>
              <th>产品</th>
              <th>类型</th>
              <th>时长</th>
              <th>状态</th>
              <th>过期时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!licenseList.length">
              <td colspan="7" class="text-center text-base-content/60">暂无数据</td>
            </tr>
            <tr v-for="row in licenseList" :key="row.id">
              <td>{{ row.id }}</td>
              <td class="font-mono text-xs">{{ row.key }}</td>
              <td>{{ row.product?.name || '-' }}</td>
              <td>
                <span class="badge badge-sm" :class="getTypeClass(row.licenseType)">
                  {{ getTypeLabel(row.licenseType) }}
                </span>
              </td>
              <td>{{ getDurationLabel(row.durationSec) }}</td>
              <td>
                <span class="badge badge-sm" :class="getStatusClass(row.status)">
                  {{ getStatusLabel(row.status) }}
                </span>
              </td>
              <td>{{ getExpireDisplay(row) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useData } from "vike-vue/useData";

const { licenses } = useData<{ products: any[]; licenses: any[] }>();
const licenseList = ref([...licenses]);

function getTypeLabel(type: string) {
  const map: Record<string, string> = { TRIAL: "试用", DAY: "天卡", MONTH: "月卡", YEAR: "年卡", PERMANENT: "永久" };
  return map[type] || type;
}

function getTypeClass(type: string) {
  const map: Record<string, string> = { TRIAL: "badge-warning", DAY: "badge-info", MONTH: "badge-info", YEAR: "badge-info", PERMANENT: "badge-success" };
  return map[type] || "badge-ghost";
}

function getDurationLabel(sec: number | null | undefined) {
  const s = sec ?? 0;
  if (s === 0) return "永久";
  if (s < 3600) return `${Math.floor(s / 60)}分钟`;
  if (s < 86400) return `${Math.floor(s / 3600)}小时`;
  if (s < 2592000) return `${Math.floor(s / 86400)}天`;
  if (s < 31536000) return `${Math.floor(s / 2592000)}月`;
  return `${Math.floor(s / 31536000)}年`;
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { ACTIVE: "有效", EXPIRED: "已过期", SUSPENDED: "已暂停", REVOKED: "已吊销" };
  return map[status] || status;
}

function getStatusClass(status: string) {
  const map: Record<string, string> = { ACTIVE: "badge-success", EXPIRED: "badge-warning", SUSPENDED: "badge-warning", REVOKED: "badge-error" };
  return map[status] || "badge-ghost";
}

function getExpireDisplay(row: any) {
  if (!row.activatedAt) return "未激活";
  if (row.licenseType === "PERMANENT") return "永久";
  if (row.expireAt) return new Date(row.expireAt).toLocaleString();
  return "永久";
}
</script>
