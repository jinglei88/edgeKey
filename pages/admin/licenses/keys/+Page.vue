<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Key 管理</h1>
          <p class="text-sm text-base-content/70">生成、查看和管理所有授权 Key。</p>
        </div>
        <div class="flex gap-2">
          <AppButton size="sm" variant="outline" @click="handleExport">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出
          </AppButton>
          <AppButton size="sm" variant="primary" @click="showGenerate = true">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            生成 Key
          </AppButton>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="flex flex-wrap gap-3 p-4 bg-base-200 rounded-lg">
        <select v-model="filters.productCode" class="select select-bordered select-sm">
          <option value="">全部产品</option>
          <option v-for="p in products" :key="p.code" :value="p.code">{{ p.name }}</option>
        </select>
        <select v-model="filters.licenseType" class="select select-bordered select-sm">
          <option value="">全部类型</option>
          <option value="TRIAL">试用</option>
          <option value="DAY">天卡</option>
          <option value="MONTH">月卡</option>
          <option value="YEAR">年卡</option>
          <option value="PERMANENT">永久卡</option>
        </select>
        <select v-model="filters.status" class="select select-bordered select-sm">
          <option value="">全部状态</option>
          <option value="ACTIVE">有效</option>
          <option value="EXPIRED">已过期</option>
          <option value="REVOKED">已吊销</option>
        </select>
        <AppButton size="sm" variant="ghost" @click="resetFilters">重置</AppButton>
      </div>

      <!-- 统计 -->
      <div class="stats stats-horizontal shadow-sm w-full">
        <div class="stat">
          <div class="stat-title">总数</div>
          <div class="stat-value text-lg">{{ licenseList.length }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">有效</div>
          <div class="stat-value text-lg text-success">{{ licenseList.filter(l => l.status === 'ACTIVE').length }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">已过期</div>
          <div class="stat-value text-lg text-warning">{{ licenseList.filter(l => l.status === 'EXPIRED').length }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">已吊销</div>
          <div class="stat-value text-lg text-error">{{ licenseList.filter(l => l.status === 'REVOKED').length }}</div>
        </div>
      </div>

      <!-- Key 列表 -->
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
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!licenseList.length">
              <td colspan="8" class="text-center text-base-content/60 py-8">暂无数据，点击"生成 Key"创建</td>
            </tr>
            <tr v-for="row in licenseList" :key="row.id">
              <td>{{ row.id }}</td>
              <td>
                <div class="flex items-center gap-1">
                  <code class="text-xs font-mono bg-base-200 px-1.5 py-0.5 rounded">{{ row.key }}</code>
                  <button class="btn btn-xs btn-ghost" @click="copyKey(row.key, row.id)">
                    <svg v-if="copiedKeyId !== row.id" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </td>
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
              <td class="text-sm">{{ getExpireDisplay(row) }}</td>
              <td>
                <div class="flex gap-1">
                  <button v-if="row.status === 'ACTIVE'" class="btn btn-xs btn-warning" @click="handleRevoke(row)">吊销</button>
                  <button class="btn btn-xs btn-error" @click="handleDelete(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- 生成 Key 弹窗 -->
  <dialog :class="{ 'modal modal-open': showGenerate }" class="modal">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg">生成 Key</h3>
      <div class="space-y-4 py-4">
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">产品</span>
          <select v-model="generateForm.productCode" class="select select-bordered w-full">
            <option value="" disabled>请选择产品</option>
            <option v-for="p in products" :key="p.code" :value="p.code">{{ p.name }} ({{ p.code }})</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">Key 类型</span>
          <select v-model="generateForm.licenseType" class="select select-bordered w-full">
            <option value="TRIAL">试用 (10分钟)</option>
            <option value="DAY">天卡 (24小时)</option>
            <option value="MONTH">月卡 (30天)</option>
            <option value="YEAR">年卡 (365天)</option>
            <option value="PERMANENT">永久卡</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">数量</span>
          <input v-model.number="generateForm.count" type="number" min="1" max="1000" class="input input-bordered w-full" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">前缀（可选）</span>
          <input v-model="generateForm.prefix" class="input input-bordered w-full" placeholder="如 EDGE" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="label-text font-medium">最大设备数</span>
          <input v-model.number="generateForm.maxDevices" type="number" min="1" max="10" class="input input-bordered w-full" />
        </label>
      </div>

      <!-- 生成结果 -->
      <div v-if="generatedKeys.length > 0" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">生成结果（{{ generatedKeys.length }} 个）</span>
          <button class="btn btn-xs btn-ghost" @click="copyAllKeys">
            {{ copiedAll ? '已复制' : '复制全部' }}
          </button>
        </div>
        <div class="max-h-40 overflow-y-auto bg-base-200 rounded p-2">
          <div v-for="key in generatedKeys" :key="key" class="font-mono text-xs py-0.5">{{ key }}</div>
        </div>
      </div>

      <p v-if="generateError" class="text-sm text-error mt-2">{{ generateError }}</p>

      <div class="modal-action">
        <AppButton variant="ghost" @click="closeGenerate">关闭</AppButton>
        <AppButton variant="primary" :loading="generating" @click="handleGenerate">生成</AppButton>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closeGenerate">
      <button>close</button>
    </form>
  </dialog>

  <!-- 确认弹窗 -->
  <dialog :class="{ 'modal modal-open': showConfirm }" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ confirmTitle }}</h3>
      <p class="py-4">{{ confirmMessage }}</p>
      <div class="modal-action">
        <AppButton variant="ghost" @click="showConfirm = false">取消</AppButton>
        <AppButton :variant="confirmDanger ? 'danger' : 'primary'" @click="confirmAction">确认</AppButton>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="showConfirm = false">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import AppButton from "../../../../components/AppButton.vue";
import { useData } from "vike-vue/useData";
import type { Data } from "./+data";

const { products, licenses } = useData<Data>();

const licenseList = ref([...licenses]);
const copiedKeyId = ref<number | null>(null);
const showGenerate = ref(false);
const generating = ref(false);
const generateError = ref("");
const generatedKeys = ref<string[]>([]);
const copiedAll = ref(false);

const showConfirm = ref(false);
const confirmTitle = ref("");
const confirmMessage = ref("");
const confirmDanger = ref(false);
let confirmCallback: (() => Promise<void>) | null = null;

const filters = reactive({ productCode: "", licenseType: "", status: "" });

const generateForm = reactive({
  productCode: "",
  licenseType: "TRIAL",
  count: 10,
  prefix: "",
  maxDevices: 1,
});

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

async function copyKey(key: string, id: number) {
  try {
    await navigator.clipboard.writeText(key);
    copiedKeyId.value = id;
    setTimeout(() => { copiedKeyId.value = null; }, 2000);
  } catch { alert("复制失败"); }
}

function resetFilters() {
  filters.productCode = "";
  filters.licenseType = "";
  filters.status = "";
  licenseList.value = [...licenses];
}

async function handleGenerate() {
  if (!generateForm.productCode) { generateError.value = "请选择产品"; return; }
  generating.value = true;
  generateError.value = "";
  try {
    const response = await fetch("/api/license/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(generateForm),
    });
    const data = await response.json();
    if (data.code === 0) {
      generatedKeys.value = data.data.keys;
      // 刷新列表
      const listRes = await fetch("/api/license/query");
      const listData = await listRes.json();
      if (listData.code === 0) licenseList.value = listData.data;
    } else {
      generateError.value = data.message;
    }
  } catch (e: any) {
    generateError.value = e.message || "生成失败";
  } finally {
    generating.value = false;
  }
}

function closeGenerate() {
  showGenerate.value = false;
  generatedKeys.value = [];
  generateError.value = "";
}

async function copyAllKeys() {
  try {
    await navigator.clipboard.writeText(generatedKeys.value.join("\n"));
    copiedAll.value = true;
    setTimeout(() => { copiedAll.value = false; }, 2000);
  } catch { alert("复制失败"); }
}

function handleRevoke(row: any) {
  confirmTitle.value = "吊销 Key";
  confirmMessage.value = `确认吊销 Key "${row.key}" 吗？吊销后将无法使用。`;
  confirmDanger.value = true;
  confirmCallback = async () => {
    const res = await fetch("/api/license/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseId: row.id, reason: "管理员手动吊销" }),
    });
    const data = await res.json();
    if (data.code === 0) {
      licenseList.value = licenseList.value.map((i) => i.id === row.id ? { ...i, status: "REVOKED" } : i);
    }
  };
  showConfirm.value = true;
}

function handleDelete(row: any) {
  confirmTitle.value = "删除 Key";
  confirmMessage.value = `确认删除 Key "${row.key}" 吗？此操作不可恢复。`;
  confirmDanger.value = true;
  confirmCallback = async () => {
    const res = await fetch("/api/license/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseId: row.id }),
    });
    const data = await res.json();
    if (data.code === 0) {
      licenseList.value = licenseList.value.filter((i) => i.id !== row.id);
    }
  };
  showConfirm.value = true;
}

async function confirmAction() {
  if (confirmCallback) await confirmCallback();
  showConfirm.value = false;
  confirmCallback = null;
}

function handleExport() {
  const headers = ["ID", "Key", "产品", "类型", "时长", "状态", "过期时间", "创建时间"];
  const rows = licenseList.value.map((i) => [
    i.id, i.key, i.product?.name || "", getTypeLabel(i.licenseType),
    getDurationLabel(i.durationSec), getStatusLabel(i.status),
    getExpireDisplay(i), new Date(i.createdAt).toLocaleString(),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `licenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>
