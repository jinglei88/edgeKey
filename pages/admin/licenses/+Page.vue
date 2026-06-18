<template>
  <section class="card bg-base-100 shadow-sm">
    <div class="card-body space-y-4">
      <div>
        <h1 class="text-2xl font-bold">产品管理</h1>
        <p class="text-sm text-base-content/70">管理授权产品，每个产品对应一个独立的授权体系。</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
        <section class="rounded-box border border-base-300 p-4">
          <h2 class="mb-3 text-lg font-semibold">{{ form.id ? `编辑 #${form.id}` : "新增产品" }}</h2>
          <div class="space-y-3">
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">产品编码</span>
              <input v-model="form.code" class="input input-bordered w-full" placeholder="如 edgekey" :disabled="!!form.id" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">产品名称</span>
              <input v-model="form.name" class="input input-bordered w-full" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="label-text font-medium">描述</span>
              <textarea v-model="form.description" class="textarea textarea-bordered w-full" rows="3"></textarea>
            </label>
            <div class="flex items-center gap-3">
              <AppButton variant="primary" size="sm" :loading="saving" @click="handleSave">保存产品</AppButton>
              <AppButton variant="ghost" size="sm" @click="resetForm">重置</AppButton>
            </div>
            <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
          </div>
        </section>

        <section>
          <div class="space-y-3">
            <div v-for="row in productList" :key="row.id" class="rounded-box border border-base-300 p-4">
              <div class="flex items-start justify-between">
                <div>
                  <div class="font-semibold">{{ row.name }}</div>
                  <div class="text-sm text-base-content/60">编码: {{ row.code }}</div>
                  <div v-if="row.description" class="text-sm text-base-content/60 mt-1">{{ row.description }}</div>
                </div>
                <div class="flex gap-2">
                  <AppButton size="xs" variant="outline" @click="startEdit(row)">编辑</AppButton>
                  <AppButton size="xs" variant="outline" @click="handleToggle(row)">
                    {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
                  </AppButton>
                </div>
              </div>
              <div class="mt-3 p-3 bg-base-200 rounded text-sm">
                <div class="flex items-center justify-between">
                  <span class="font-medium">API Key（客户端 SDK 使用）:</span>
                  <AppButton size="xs" variant="ghost" @click="copyApiKey(row.apiKey)">
                    {{ copiedId === row.id ? '已复制' : '复制' }}
                  </AppButton>
                </div>
                <div class="font-mono text-xs mt-1 break-all">{{ row.apiKey }}</div>
              </div>
            </div>
            <div v-if="!productList.length" class="text-center text-base-content/60 py-8">
              当还没有产品，先创建第一个。
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../lib/app-error";
import { reactive, ref } from "vue";
import AppButton from "../../../components/AppButton.vue";
import { useData } from "vike-vue/useData";
import { onSaveLicenseProduct, onToggleLicenseProduct } from "./saveLicenseProduct.telefunc";
import type { Data } from "./+data";

const { products } = useData<Data>();

const productList = ref([...products]);
const saving = ref(false);
const errorMessage = ref("");
const copiedId = ref<number | null>(null);

const form = reactive({
  id: undefined as number | undefined,
  code: "",
  name: "",
  description: "",
});

function resetForm() {
  form.id = undefined;
  form.code = "";
  form.name = "";
  form.description = "";
  errorMessage.value = "";
}

function startEdit(product: (typeof products)[number]) {
  form.id = product.id;
  form.code = product.code;
  form.name = product.name;
  form.description = product.description ?? "";
  errorMessage.value = "";
}

async function handleSave() {
  saving.value = true;
  errorMessage.value = "";

  try {
    const result = await onSaveLicenseProduct({
      id: form.id,
      code: form.code,
      name: form.name,
      description: form.description,
    });

    const index = productList.value.findIndex((item) => item.id === result.id);
    if (index >= 0) {
      productList.value[index] = result;
    } else {
      productList.value.unshift(result);
    }

    resetForm();
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "保存失败");
  } finally {
    saving.value = false;
  }
}

async function handleToggle(product: (typeof products)[number]) {
  const nextStatus = product.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
  const result = await onToggleLicenseProduct({
    id: product.id,
    status: nextStatus,
  });

  productList.value = productList.value.map((item) => {
    if (item.id !== result.id) return item;
    return {
      ...item,
      status: result.status,
    };
  });
}

async function copyApiKey(apiKey: string) {
  try {
    await navigator.clipboard.writeText(apiKey);
    copiedId.value = productList.value.find((item) => item.apiKey === apiKey)?.id || null;
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch {
    alert("复制失败，请手动复制");
  }
}
</script>
