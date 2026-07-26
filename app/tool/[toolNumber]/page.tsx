import { supabase } from "@/lib/supabase";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ toolNumber: string }>;
}) {
  const { toolNumber } = await params;

  const { data: tool } = await supabase
    .from("tools")
    .select("*")
    .eq("tool_number", toolNumber)
    .single();

  const { data: parts } = await supabase
    .from("spare_parts")
    .select("*")
    .eq("tool_number", toolNumber);

  return (
    <main className="p-8">

      <h1 className="text-4xl font-bold mb-6">
        {toolNumber}
      </h1>

      <div className="border rounded-lg p-4 mb-8 bg-white">

        <p>
          <strong>Shelf:</strong>{" "}
          {tool?.kardex_shelf}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {tool?.status}
        </p>

      </div>

      <h2 className="text-2xl font-semibold mb-4">
        Spare Parts
      </h2>

      <div className="overflow-auto">

        <table className="w-full border">

          <thead>

            <tr className="bg-gray-100">

              <th className="border p-2">
                ENDR Code
              </th>

              <th className="border p-2">
                Specification
              </th>

              <th className="border p-2">
                Shelf
              </th>

            </tr>

          </thead>

          <tbody>

            {parts?.map((part) => (

              <tr key={part.id}>

                <td className="border p-2">
                  {part.endr_code}
                </td>

                <td className="border p-2">
                  {part.specification}
                </td>

                <td className="border p-2">
                  {part.kardex_shelf}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </main>
  );
}