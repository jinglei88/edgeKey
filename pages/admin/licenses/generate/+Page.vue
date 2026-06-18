<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div>
        <h1 class="text-2xl font-bold">发卡管理</h1>
        <p class="text-sm text-base-content/70">批量生成授权 Key，用于销售或分发。</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
        <section class="rounded-box border border-base-300 p-4">
          <h2 class="mb-3 text-lg font-semibold">生成 Key</h2>
          <div class="space-y-3">
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">产品</span>
              <select v-model="form.productCode" class="select select-bordered w-full">
                <option value="" disabled>请选择产品</option>
                <option v-for="p in products" :key="p.code" :value="p.code">{{ p.name }} ({{ p.code }})</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">Key 类型</span>
              <select v-model="form.licenseType" class="select select-bordered w-full">
                <option value="TRIAL">试用 (10分钟)</option>
                <option value="DAY">天卡 (24小时)</option>
                <option value="MONTH">月卡 (30天)</option>
                <option value="YEAR">年卡 (365天)</option>
                <option value="PERMANENT">永久卡</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">数量</span>
              <input v-model.number="form.count" type="number" min="1" max="1000" class="input input-bordered w-full" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">前缀（可选）</span>
              <input v-model="form.prefix" class="input input-bordered w-full" placeholder="如 EDGE" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">最大设备数</span>
              <input v-model.number="form.maxDevices" type="number" min="1" max="10" class="input input-bordered w-full" />
            </label>
            <div class="flex items-center gap-3">
              <AppButton variant="primary" size="sm" :loading="generating" @click="handleGenerate">生成 Key</AppButton>
              <AppButton variant="ghost" size="sm" @click="resetForm">重置</AppButton>
            </div>
            <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
          </div>
        </section>

        <section>
          <div v-if="generatedKeys.length > 0" class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">生成结果（{{ generatedKeys.length }} 个）</h2>
              <AppButton size="sm" variant="outline" @click="copyAll">复制全部</AppButton>
            </div>
            <div class="rounded-box border border-base-300 p-4 max-h-96 overflow-y-auto">
              <div v-for="key in generatedKeys" :key="key" class="font-mono text-sm py-1 border-b border-base-200 last:border-0">
                {{ key }}
              </div>
            </div>
            <p v-if="copyMessage" class="text-sm text-success">{{ copyMessage }}</p>
          </div>
          <div v-else class="flex items-center justify-center h-64 text-base-content/50">
            生成后将在此显示结果
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../../lib/app-error";
import { reactive, ref } from "vue";
import AppButton from "../../../../components/AppButton.vue";
import { useData } from "vike-vue/useData";
import { onGenerateLicenseKeys } from "../generateLicenseKeys.telefunc";
import type { Data } from "./+data";

const { products } = useData<Data>();

const form = reactive({
  productCode: "",
  licenseType: "TRIAL",
  count: 10,
  prefix: "",
  maxDevices: 1,
});

const generating = ref(false);
const errorMessage = ref("");
const generatedKeys = ref<string[]>([]);
const copyMessage = ref("");

function resetForm() {
  form.productCode = "";
  form.licenseType = "TRIAL";
  form.count = 10;
  form.prefix = "";
  form.maxDevices = 1;
  errorMessage.value = "";
  generatedKeys.value = [];
}

async function handleGenerate() {
  if (!form.productCode) {
    errorMessage.value = "请选择产品";
    return;
  }

  generating.value = true;
  errorMessage.value = "";

  try {
    const result = await onGenerateLicenseKeys({
      productCode: form.productCode,
      licenseType: form.licenseType as any,
      count: form.count,
      prefix: form.prefix || undefined,
      maxDevices: form.maxDevices,
    });

    generatedKeys.value = result.keys;
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "生成失败");
  } finally {
    generating.value = false;
  }
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(generatedKeys.value.join("\n"));
    copyMessage.value = "已复制到剪贴板";
    setTimeout(() => {
      copyMessage.value = "";
    }, 2000);
  } catch {
    copyMessage.value = "复制失败，请手动选择";
  }
}
</script>
