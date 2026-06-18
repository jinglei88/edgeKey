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
          <DataTable
            :columns="columns"
            :rows="productList"
            :total="productList.length"
            :page="1"
            :page-size="productList.length || 1"
            empty-text="当前还没有产品，先创建第一个。"
          >
            <template #code="{ row }">
              <div class="font-mono text-sm">{{ row.code }}</div>
            </template>
            <template #status="{ row }">
              <StatusTag :type="row.status === 'ACTIVE' ? 'success' : 'default'">
                {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
              </StatusTag>
            </template>
            <template #actions="{ row }">
              <div class="flex gap-2">
                <AppButton size="xs" variant="outline" @click="startEdit(row)">编辑</AppButton>
                <AppButton size="xs" variant="outline" @click="handleToggle(row)">
                  {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
                </AppButton>
              </div>
            </template>
          </DataTable>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../lib/app-error";
import { reactive, ref } from "vue";
import AppButton from "../../../components/AppButton.vue";
import DataTable from "../../../components/DataTable.vue";
import StatusTag from "../../../components/StatusTag.vue";
import { useData } from "vike-vue/useData";
import { onSaveLicenseProduct, onToggleLicenseProduct } from "./saveLicenseProduct.telefunc";
import type { Data } from "./+data";

const { products } = useData<Data>();

const columns = [
  { key: "id", label: "ID" },
  { key: "code", label: "编码" },
  { key: "name", label: "名称" },
  { key: "description", label: "描述" },
  { key: "status", label: "状态" },
  { key: "actions", label: "操作" },
];

const productList = ref([...products]);
const saving = ref(false);
const errorMessage = ref("");

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
</script>
