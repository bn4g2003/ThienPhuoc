/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilterField } from "@/types";
import { Button, Card, DatePicker, Divider, Form, Input, Select } from "antd";
import { FormInstance } from "antd/lib";

interface FilterListProps {
  fields: FilterField[];
  onApplyFilter: (arr: { key: string; value: any }[]) => void;
  onReset?: () => void;
  onCancel?: () => void;
  form: FormInstance<any>;
  instant?: boolean;
}

export const FilterList: React.FC<FilterListProps> = ({
  fields,
  onApplyFilter,
  onReset,
  onCancel = () => {},
  form,
  instant = false,
}) => {
  const handleReset = () => {
    form.resetFields();
    if (onReset) {
      onReset();
    }
  };

  const handleFinish = (values: Record<string, any>) => {
    const payload: {
      key: string;
      value: any;
    }[] = [];
    const normalize = (v: any) => {
      // dayjs objects from DatePicker/RangePicker have toDate()
      if (v && typeof v.toDate === "function") {
        return v.toDate();
      }
      // RangePicker: [start, end]
      if (
        Array.isArray(v) &&
        v.length === 2 &&
        v[0] &&
        typeof v[0].toDate === "function"
      ) {
        const from = v[0].toDate();
        const to = v[1] ? v[1].toDate() : null;
        return { from, to };
      }
      return v;
    };

    Object.entries(values).forEach(([key, value]) => {
      const nv = normalize(value);
      if (nv !== undefined && nv !== null && nv !== "") {
        payload.push({ key, value: nv });
      }
    });
    onApplyFilter(payload);
    onCancel();
  };

  const handleValuesChange = (_: any, values: Record<string, any>) => {
    if (!instant) return;
    const payload: { key: string; value: any }[] = [];
    const normalize = (v: any) => {
      if (v && typeof v.toDate === "function") return v.toDate();
      if (
        Array.isArray(v) &&
        v.length === 2 &&
        v[0] &&
        typeof v[0].toDate === "function"
      ) {
        const from = v[0].toDate();
        const to = v[1] ? v[1].toDate() : null;
        return { from, to };
      }
      return v;
    };

    Object.entries(values).forEach(([key, value]) => {
      const nv = normalize(value);
      if (nv !== undefined && nv !== null && nv !== "") {
        payload.push({ key, value: nv });
      }
    });
    onApplyFilter(payload);
  };

  const renderField = (field: FilterField) => {
    switch (field.type) {
      case "input":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <Input placeholder={field.placeholder || field.label} allowClear />
          </Form.Item>
        );

      case "select":
        return (
          <Form.Item

            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <Select
              mode={field.isMultiple ? "multiple" : undefined}
              options={field.options || []}
              placeholder={field.placeholder || `Chọn ${field.label}`}
              allowClear
            />
          </Form.Item>
        );

      case "date":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className="mb-4"
          >
            <DatePicker
              className=" w-full"
              placeholder={field.placeholder || field.label}
            />
          </Form.Item>
        );

      case "dateRange":
        return (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            className=" mb-4"
          >
            <DatePicker.RangePicker className=" w-full" />
          </Form.Item>
        );

      default:
        return null;
    }
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <Card title={instant ? "Bộ lọc" : null}>
      {!instant && (
        <>
          <div className=" flex  justify-between  items-center mb-2">
            <h3 className=" font-medium  mb-0">Bộ lọc</h3>
            <Button
              type="link"
              onClick={handleReset}
              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
            >
              Đặt lại
            </Button>
          </div>
          <Divider className=" my-2" />
        </>
      )}
      <Form
        layout="vertical"
        form={form}
        onFinish={handleFinish}
        onValuesChange={handleValuesChange}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fields.map((field) => (
            <div key={field.name} className="col-span-1">
              {renderField(field)}
            </div>
          ))}
        </div>

        {!instant && (
          <>
            <Divider className=" my-2" />

            <div className="flex justify-end gap-2 mt-2">
              <Button type="default" onClick={onCancel}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Áp dụng
              </Button>
            </div>
          </>
        )}
      </Form>
    </Card>
  );
};
