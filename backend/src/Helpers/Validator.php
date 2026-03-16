<?php

declare(strict_types=1);

namespace App\Helpers;

class Validator
{
    private array $errors = [];
    private array $data;
    private array $rules;

    public function __construct(array $data, array $rules)
    {
        $this->data  = $data;
        $this->rules = $rules;
    }

    // Ejecuta la validacion y retorna true si no hay errores
    public function validate(): bool
    {
        $this->errors = [];

        foreach ($this->rules as $field => $ruleSet) {
            $rules = is_string($ruleSet) ? explode('|', $ruleSet) : $ruleSet;
            $value = $this->data[$field] ?? null;

            foreach ($rules as $rule) {
                $this->applyRule($field, $value, $rule);
            }
        }

        return empty($this->errors);
    }

    // Retorna los errores de validacion
    public function getErrors(): array
    {
        return $this->errors;
    }

    // Retorna los datos validados (solo campos definidos en reglas)
    public function getValidData(): array
    {
        $valid = [];
        foreach (array_keys($this->rules) as $field) {
            if (array_key_exists($field, $this->data)) {
                $valid[$field] = $this->data[$field];
            }
        }
        return $valid;
    }

    // Aplica una regla individual a un campo
    private function applyRule(string $field, mixed $value, string $rule): void
    {
        $params = [];
        if (str_contains($rule, ':')) {
            [$rule, $paramStr] = explode(':', $rule, 2);
            $params = explode(',', $paramStr);
        }

        match ($rule) {
            'required'  => $this->validateRequired($field, $value),
            'string'    => $this->validateString($field, $value),
            'integer'   => $this->validateInteger($field, $value),
            'numeric'   => $this->validateNumeric($field, $value),
            'email'     => $this->validateEmail($field, $value),
            'min'       => $this->validateMin($field, $value, (int)$params[0]),
            'max'       => $this->validateMax($field, $value, (int)$params[0]),
            'in'        => $this->validateIn($field, $value, $params),
            'uuid'      => $this->validateUuid($field, $value),
            'date'      => $this->validateDate($field, $value),
            'boolean'   => $this->validateBoolean($field, $value),
            'nullable'  => null,
            default     => null,
        };
    }

    private function addError(string $field, string $message): void
    {
        $this->errors[$field][] = $message;
    }

    private function validateRequired(string $field, mixed $value): void
    {
        if ($value === null || $value === '') {
            $this->addError($field, "El campo {$field} es obligatorio");
        }
    }

    private function validateString(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '' && !is_string($value)) {
            $this->addError($field, "El campo {$field} debe ser texto");
        }
    }

    private function validateInteger(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '' && !is_int($value) && !ctype_digit((string)$value)) {
            $this->addError($field, "El campo {$field} debe ser un numero entero");
        }
    }

    private function validateNumeric(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '' && !is_numeric($value)) {
            $this->addError($field, "El campo {$field} debe ser numerico");
        }
    }

    private function validateEmail(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->addError($field, "El campo {$field} debe ser un email valido");
        }
    }

    private function validateMin(string $field, mixed $value, int $min): void
    {
        if ($value === null || $value === '') return;

        if (is_string($value) && mb_strlen($value) < $min) {
            $this->addError($field, "El campo {$field} debe tener al menos {$min} caracteres");
        } elseif (!is_string($value) && is_numeric($value) && (float)$value < $min) {
            $this->addError($field, "El campo {$field} debe ser al menos {$min}");
        }
    }

    private function validateMax(string $field, mixed $value, int $max): void
    {
        if ($value === null || $value === '') return;

        if (is_string($value) && mb_strlen($value) > $max) {
            $this->addError($field, "El campo {$field} no debe exceder {$max} caracteres");
        } elseif (!is_string($value) && is_numeric($value) && (float)$value > $max) {
            $this->addError($field, "El campo {$field} no debe exceder {$max}");
        }
    }

    private function validateIn(string $field, mixed $value, array $allowed): void
    {
        if ($value !== null && $value !== '' && !in_array((string)$value, $allowed, true)) {
            $this->addError($field, "El campo {$field} debe ser uno de: " . implode(', ', $allowed));
        }
    }

    private function validateUuid(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '' && !UUID::isValid((string)$value)) {
            $this->addError($field, "El campo {$field} debe ser un UUID valido");
        }
    }

    private function validateDate(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '') {
            $date = \DateTime::createFromFormat('Y-m-d', (string)$value);
            if (!$date || $date->format('Y-m-d') !== (string)$value) {
                $this->addError($field, "El campo {$field} debe tener formato YYYY-MM-DD");
            }
        }
    }

    private function validateBoolean(string $field, mixed $value): void
    {
        if ($value !== null && $value !== '' && !in_array($value, [true, false, 0, 1, '0', '1'], true)) {
            $this->addError($field, "El campo {$field} debe ser booleano");
        }
    }

    public static function make(array $data, array $rules): self
    {
        $validator = new self($data, $rules);
        $validator->validate();
        return $validator;
    }
}
