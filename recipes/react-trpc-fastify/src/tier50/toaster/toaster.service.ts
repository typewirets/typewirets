export type ToastMessage = (() => React.ReactNode) | React.ReactNode;

export interface ToastIcons {
  success?: React.ReactNode;
  info?: React.ReactNode;
  warning?: React.ReactNode;
  error?: React.ReactNode;
  loading?: React.ReactNode;
  close?: React.ReactNode;
}

export interface Action {
  label: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  actionButtonStyle?: React.CSSProperties;
}

export interface ToastOption {
  icon?: React.ReactNode;
  closeButton?: boolean;
  dismissible?: boolean;
  richColors?: boolean;
  action?: Action | React.ReactNode;
  cancel?: Action | React.ReactNode;
}

export interface ToasterService {
  success: (
    message: ToastMessage | React.ReactNode,
    data?: ToastOption,
  ) => string | number;
  info: (
    message: ToastMessage | React.ReactNode,
    data?: ToastOption,
  ) => string | number;
  warning: (
    message: ToastMessage | React.ReactNode,
    data?: ToastOption,
  ) => string | number;
  error: (
    message: ToastMessage | React.ReactNode,
    data?: ToastOption,
  ) => string | number;
  dismiss: (id?: number | string) => string | number;
}
