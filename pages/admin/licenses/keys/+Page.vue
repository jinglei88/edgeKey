<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div>
        <h1 class="text-2xl font-bold">Key 管理</h1>
        <p class="text-sm text-base-content/70">查看、筛选和管理所有授权 Key。</p>
      </div>

      <div class="flex flex-wrap gap-3">
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
        <AppButton size="sm" variant="outline" @click="handleQuery">查询</AppButton>
        <AppButton size="sm" variant="ghost" @click="handleExport">导出 CSV</AppButton>
      </div>

      <DataTable
        :columns="columns"
        :rows="licenseList"
        :total="licenseList.length"
        :page="1"
        :page-size="licenseList.length || 1"
        empty-text="暂无数据"
      >
        <template #key="{ row }">
          <div class="font-mono text-xs max-w-xs truncate">{{ row.key }}</div>
        </template>
        <template #productCode="{ row }">
          <div class="text-sm">{{ row.product?.code }}</div>
        </template>
        <template #licenseType="{ row }">
          <StatusTag :type="getTypeTagType(row.licenseType)">
            {{ getTypeLabel(row.licenseType) }}
          </StatusTag>
        </template>
        <template #status="{ row }">
          <StatusTag :type="getStatusTagType(row.status)">
            {{ getStatusLabel(row.status) }}
          </StatusTag>
        </template>
        <template #expireAt="{ row }">
          <div class="text-sm">
            {{ getExpireAtDisplay(row) }}
          </div>
        </template>
        <template #actions="{ row }">
          <div class="flex gap-2">
            <AppButton
              v-if="row.status === 'ACTIVE'"
              size="xs"
              variant="danger"
              @click="handleRevoke(row)"
            >
              吊销
            </AppButton>
          </div>
        </template>
      </DataTable>
    </div>
  </section>
  <ConfirmDialog ref="confirmRef" />
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../../lib/app-error";
import { reactive, ref, useTemplateRef } from "vue";
import AppButton from "../../../../components/AppButton.vue";
import DataTable from "../../../../components/DataTable.vue";
import StatusTag from "../../../../components/StatusTag.vue";
import ConfirmDialog from "../../../../components/ConfirmDialog.vue";
import { useData } from "vike-vue/useData";
import { onQueryLicenseKeys } from "../queryLicenseKeys.telefunc";
import { onRevokeLicenseKey } from "../revokeLicenseKey.telefunc";
import type { Data } from "./+data";

const { products, licenses } = useData<Data>();

const columns = [
  { key: "id", label: "ID" },
  { key: "key", label: "Key" },
  { key: "productCode", label: "产品" },
  { key: "licenseType", label: "类型" },
  { key: "status", label: "状态" },
  { key: "expireAt", label: "过期时间" },
  { key: "actions", label: "操作" },
];

const licenseList = ref([...licenses]);
const errorMessage = ref("");
const confirmRef = useTemplateRef<InstanceType<typeof ConfirmDialog>>("confirmRef");

const filters = reactive({
  productCode: "",
  licenseType: "",
  status: "",
});

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    TRIAL: "试用",
    DAY: "天卡",
    MONTH: "月卡",
    YEAR: "年卡",
    PERMANENT: "永久",
  };
  return labels[type] || type;
}

function getTypeTagType(type: string) {
  const types: Record<string, string> = {
    TRIAL: "warning",
    DAY: "info",
    MONTH: "info",
    YEAR: "info",
    PERMANENT: "success",
  };
  return types[type] || "default";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "有效",
    EXPIRED: "已过期",
    SUSPENDED: "已暂停",
    REVOKED: "已吊销",
  };
  return labels[status] || status;
}

function getStatusTagType(status: string) {
  const types: Record<string, string> = {
    ACTIVE: "success",
    EXPIRED: "warning",
    SUSPENDED: "warning",
    REVOKED: "danger",
  };
  return types[status] || "default";
}

function getExpireAtDisplay(row: any) {
  if (!row.activatedAt) return "未激活";
  if (row.licenseType === "PERMANENT") return "永久";
  if (row.expireAt) return new Date(row.expireAt).toLocaleString();
  return "永久";
}

async function handleQuery() {
  try {
    const result = await onQueryLicenseKeys({
      productCode: filters.productCode || undefined,
      licenseType: filters.licenseType || undefined,
      status: filters.status || undefined,
    });
    licenseList.value = result;
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "查询失败");
  }
}

async function handleRevoke(license: (typeof licenses)[number]) {
  if (!await confirmRef.value?.confirm({
    title: "吊销 Key",
    message: `确认吊销 Key "${license.key}" 吗？吊销后将无法使用。`,
    confirmText: "吊销",
    danger: true,
  })) {
    return;
  }

  try {
    await onRevokeLicenseKey({
      licenseId: license.id,
      reason: "管理员手动吊销",
    });

    licenseList.value = licenseList.value.map((item) => {
      if (item.id !== license.id) return item;
      return { ...item, status: "REVOKED" };
    });
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "吊销失败");
  }
}

function handleExport() {
  const headers = ["ID", "Key", "产品", "类型", "状态", "过期时间", "创建时间"];
  const rows = licenseList.value.map((item) => [
    item.id,
    item.key,
    item.product?.code || "",
    item.licenseType,
    item.status,
    item.expireAt ? new Date(item.expireAt).toLocaleString() : "永久",
    new Date(item.createdAt).toLocaleString(),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `licenses-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>
