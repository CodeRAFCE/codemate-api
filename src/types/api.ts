export interface ApiResponse<T = null> {
  status: "success" | "fail" | "error";
  message: string;
  data?: T;
}
