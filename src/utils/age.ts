import User from "../lib/types/User";
import { useOfflineSWR } from "../lib/useOfflineSWR";

export const useIsTeen = (): boolean => {
  const { data: user } = useOfflineSWR<User>("user");
  const birthday = user?.birthday;

  if (!birthday) {
    return false;
  }

  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 13 && age < 19;
};
